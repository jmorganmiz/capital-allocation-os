import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseOMBuffer } from '@/lib/parse-om-core'
import { getResend } from '@/lib/resend'
import { createHash } from 'node:crypto'
import { scoreInboundDeal } from '@/lib/score-inbound'

export const runtime = 'nodejs'
export const maxDuration = 120

// Required env vars:
//   RESEND_WEBHOOK_SECRET — signing secret from the Resend webhook configuration
//   NEXT_PUBLIC_APP_URL  — base URL used in notification emails (e.g. https://app.getdealstash.com)

const FROM_EMAIL = 'inbox@getdealstash.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.getdealstash.com'

// ── Resend inbound email payload ──────────────────────────────────────────────

interface ResendAttachment {
  filename: string
  content: string    // base64-encoded file bytes
  contentType: string
  size?: number
}

interface ResendWebhookEvent {
  type: string
  data: { email_id?: string }
}

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024
const MAX_ATTACHMENTS = 3

interface ResendInboundPayload {
  from: string
  to: string | string[]
  subject?: string
  text?: string
  html?: string
  attachments?: ResendAttachment[]
  messageId?: string
  headers?: Record<string, string>
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[inbox] RESEND_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 })
  }

  const rawBody = await req.text()
  let event: ResendWebhookEvent
  try {
    event = await getResend().webhooks.verify({
      payload: rawBody,
      headers: {
        id: req.headers.get('svix-id') ?? '',
        timestamp: req.headers.get('svix-timestamp') ?? '',
        signature: req.headers.get('svix-signature') ?? '',
      },
      webhookSecret,
    }) as ResendWebhookEvent
  } catch {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  if (event.type !== 'email.received') {
    return NextResponse.json({ received: true, skipped: 'unsupported event' })
  }

  const emailId = event.data.email_id
  if (!emailId) return NextResponse.json({ error: 'missing_email_id' }, { status: 400 })

  const { data: email, error: emailError } = await getResend().emails.receiving.get(emailId)

  if (emailError || !email) {
    console.error('[inbox] failed to retrieve received email')
    return NextResponse.json({ error: 'email_retrieval_failed' }, { status: 502 })
  }

  const payload: ResendInboundPayload = {
    from: email.from,
    to: email.to,
    subject: email.subject ?? undefined,
    text: email.text ?? undefined,
    html: email.html ?? undefined,
    attachments: [],
    messageId: email.message_id ?? emailId,
    headers: email.headers ?? undefined,
  }

  // Normalise the To field: strip display names and angle brackets, lowercase
  const toAddresses = (Array.isArray(payload.to) ? payload.to : [payload.to])
    .map(addr => addr.replace(/^.*<(.+)>.*$/, '$1').trim().toLowerCase())
    .filter(Boolean)

  console.log('[inbox] normalised to addresses:', toAddresses)

  if (toAddresses.length === 0) {
    console.warn('[inbox] no valid To addresses')
    return NextResponse.json({ received: true, skipped: 'no valid to addresses' })
  }

  const supabase = createAdminClient()

  // Look up firm by inbox_email
  const { data: firm, error: firmErr } = await supabase
    .from('firms')
    .select('id, name, inbox_email')
    .in('inbox_email', toAddresses)
    .maybeSingle()

  if (firmErr) {
    console.error('[inbox] firm lookup error:', firmErr.message)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }

  if (!firm) {
    // Return 200 so Resend doesn't retry — this just isn't a known inbox address
    console.warn('[inbox] no firm matched addresses:', toAddresses)
    return NextResponse.json({ received: true, skipped: 'no matching firm' })
  }

  console.log('[inbox] matched firm:', firm.name, '| id:', firm.id)

  const { data: claimStatus, error: claimError } = await supabase.rpc(
    'claim_inbound_email_event',
    { p_event_id: emailId },
  )
  if (claimError) {
    console.error('[inbox] failed to claim webhook:', claimError.code)
    return NextResponse.json({ error: 'receipt_failed' }, { status: 500 })
  }
  if (claimStatus === 'processed') {
    return NextResponse.json({ received: true, duplicate: true })
  }
  if (claimStatus !== 'claimed') {
    return NextResponse.json({ error: 'processing_in_progress' }, { status: 503 })
  }

  await supabase
    .from('inbound_email_events')
    .update({
      firm_id: firm.id,
      sender: payload.from,
      recipient: toAddresses.join(', '),
      subject: payload.subject ?? null,
    })
    .eq('id', emailId)

  const { data: attachmentList, error: attachmentError } =
    await getResend().emails.receiving.attachments.list({ emailId })
  if (attachmentError) {
    console.error('[inbox] failed to list received email attachments')
    await failInboundEvent(supabase, emailId, 'attachment_list_failed')
    return NextResponse.json({ error: 'attachment_list_failed' }, { status: 502 })
  }

  const pdfMetadata = (attachmentList?.data ?? [])
    .filter(a => a.content_type === 'application/pdf' || (a.filename ?? '').toLowerCase().endsWith('.pdf'))
    .slice(0, MAX_ATTACHMENTS)

  const attachments: ResendAttachment[] = []
  for (const attachment of pdfMetadata) {
    if (attachment.size > MAX_ATTACHMENT_BYTES) continue
    try {
      const response = await fetch(attachment.download_url)
      if (!response.ok) throw new Error(`download returned ${response.status}`)
      const bytes = Buffer.from(await response.arrayBuffer())
      if (bytes.length > MAX_ATTACHMENT_BYTES) continue
      attachments.push({
        filename: attachment.filename ?? 'attachment.pdf',
        content: bytes.toString('base64'),
        contentType: attachment.content_type ?? 'application/pdf',
        size: bytes.length,
      })
    } catch (error) {
      console.error('[inbox] attachment download failed:', error instanceof Error ? error.message : 'unknown error')
      await failInboundEvent(supabase, emailId, 'attachment_download_failed')
      return NextResponse.json({ error: 'attachment_download_failed' }, { status: 502 })
    }
  }
  payload.attachments = attachments

  // Filter PDF attachments only
  const pdfAttachments = (payload.attachments ?? []).filter(a =>
    a.contentType === 'application/pdf' ||
    (a.filename ?? '').toLowerCase().endsWith('.pdf')
  )

  if (pdfAttachments.length === 0) {
    await failInboundEvent(supabase, emailId, 'no_pdf_attachment')
    console.log('[inbox] no PDF attachments — skipping')
    return NextResponse.json({ error: 'no_pdf_attachment' }, { status: 422 })
  }

  await supabase
    .from('inbound_email_events')
    .update({
      attachment_count: pdfAttachments.length,
    })
    .eq('id', emailId)

  console.log('[inbox] PDF attachments count:', pdfAttachments.length)

  // Pre-fetch firm's first stage and an actor profile (for created_by / audit fields)
  const [{ data: firstStage }, { data: memberRows }] = await Promise.all([
    supabase
      .from('deal_stages')
      .select('id')
      .eq('firm_id', firm.id)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('id')
      .eq('firm_id', firm.id)
      .order('created_at', { ascending: true })
      .limit(1),
  ])

  const stageId: string | null = firstStage?.id ?? null
  const actorId: string | null = memberRows?.[0]?.id ?? null

  const createdDeals: Array<{ id: string; title: string }> = []
  let processingFailed = false

  for (const attachment of pdfAttachments) {
    console.log('[inbox] processing:', attachment.filename, '| size:', attachment.size ?? 'unknown')
    try {
      const result = await processAttachment({
        supabase,
        firmId: firm.id,
        stageId,
        actorId,
        attachment,
        payload,
        intakeKey: createHash('sha256')
          .update(`${emailId}:`)
          .update(attachment.content)
          .digest('hex'),
      })
      if (result) {
        createdDeals.push(result)
        console.log('[inbox] deal created:', result.id, '|', result.title)
      }
    } catch (err) {
      processingFailed = true
      console.error('[inbox] error processing attachment:', attachment.filename, err)
    }
  }

  if (processingFailed || createdDeals.length !== pdfAttachments.length) {
    await supabase
      .from('inbound_email_events')
      .update({
        status: 'failed',
        last_error: 'attachment_processing_failed',
        deal_ids: createdDeals.map(deal => deal.id),
        updated_at: new Date().toISOString(),
      })
      .eq('id', emailId)
    return NextResponse.json({ error: 'attachment_processing_failed' }, { status: 500 })
  }

  const { error: completeError } = await supabase
    .from('inbound_email_events')
    .update({
      status: 'processed',
      processed_at: new Date().toISOString(),
      last_error: null,
      deal_ids: createdDeals.map(deal => deal.id),
    })
    .eq('id', emailId)
  if (completeError) {
    console.error('[inbox] failed to complete webhook receipt:', completeError.code)
    return NextResponse.json({ error: 'receipt_completion_failed' }, { status: 500 })
  }

  // Notify firm members
  if (createdDeals.length > 0) {
    try {
      await notifyFirmMembers({ supabase, firm, createdDeals, payload })
    } catch (err) {
      console.error('[inbox] notification email failed:', err)
    }
  }

  console.log('[inbox] done — deals created:', createdDeals.length)
  return NextResponse.json({ received: true, dealsCreated: createdDeals.length })
}

// ── Process a single PDF attachment ───────────────────────────────────────────

async function failInboundEvent(
  supabase: ReturnType<typeof createAdminClient>,
  emailId: string,
  lastError: string,
) {
  await supabase
    .from('inbound_email_events')
    .update({ status: 'failed', last_error: lastError, updated_at: new Date().toISOString() })
    .eq('id', emailId)
}

async function processAttachment({
  supabase,
  firmId,
  stageId,
  actorId,
  attachment,
  payload,
  intakeKey,
}: {
  supabase: ReturnType<typeof createAdminClient>
  firmId: string
  stageId: string | null
  actorId: string | null
  attachment: ResendAttachment
  payload: ResendInboundPayload
  intakeKey: string
}): Promise<{ id: string; title: string } | null> {

  const { data: existingDeal, error: existingDealError } = await supabase
    .from('deals')
    .select('id, title')
    .eq('firm_id', firmId)
    .eq('inbound_intake_key', intakeKey)
    .maybeSingle()
  if (existingDealError) throw existingDealError
  if (existingDeal) return existingDeal

  // Decode base64 attachment content
  const buffer = Buffer.from(attachment.content, 'base64')

  // Upload to Supabase Storage
  const safeFilename = (attachment.filename ?? 'om.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${firmId}/email-inbox/${intakeKey}_${safeFilename}`

  const { error: uploadErr } = await supabase.storage
    .from('deal-files')
    .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: true })

  if (uploadErr) {
    throw uploadErr
  }

  console.log('[inbox] uploaded to storage:', storagePath)

  // Parse OM through the shared Claude pipeline
  const parseResult = await parseOMBuffer(buffer)
  const parsedData = 'data' in parseResult ? parseResult.data : null

  if (parsedData) {
    console.log('[inbox] parse succeeded via:', 'via' in parseResult && parseResult.via === 'vision' ? 'vision' : 'text')
  } else {
    console.warn('[inbox] parse failed or returned no data — deal will still be created with available info')
  }

  // Derive deal title: parsed address → email subject → filename
  const dealTitle =
    parsedData?.address?.trim() ||
    payload.subject?.trim() ||
    safeFilename.replace(/\.pdf$/i, '')

  // Extract sender broker identity
  const fromAddrMatch = payload.from.match(/<(.+?)>/)
  const fromEmail = fromAddrMatch ? fromAddrMatch[1] : payload.from
  const fromNameMatch = payload.from.match(/^(.+?)\s*</)
  const fromDisplayName = fromNameMatch ? fromNameMatch[1].trim() : null

  const brokerName = parsedData?.broker_name || fromDisplayName || null
  const brokerCompany = parsedData?.brokerage || null

  // Create the deal
  const { data: deal, error: dealErr } = await supabase
    .from('deals')
    .insert({
      firm_id:       firmId,
      title:         dealTitle,
      address:       parsedData?.address ?? null,
      market:        parsedData?.market ?? null,
      deal_type:     parsedData?.property_type ?? null,
      source_type:   'Broker',
      source_name:   brokerName,
      asking_price:  parsedData?.asking_price ?? null,
      stage_id:      stageId,
      intake_type:   'email',
      created_by:    actorId,
      owner_user_id: actorId,
      inbound_intake_key: intakeKey,
    })
    .select('id')
    .single()

  if (dealErr) {
    if (dealErr.code === '23505') {
      const { data: duplicate } = await supabase
        .from('deals')
        .select('id, title')
        .eq('firm_id', firmId)
        .eq('inbound_intake_key', intakeKey)
        .single()
      if (duplicate) return duplicate
    }
    throw dealErr
  }

  const dealId = deal.id

  // Audit: deal_created event
  await supabase.from('deal_events').insert({
    deal_id:       dealId,
    firm_id:       firmId,
    actor_user_id: actorId,
    event_type:    'deal_created',
    to_stage_id:   stageId,
    notes:         `Auto-created from email inbox (from: ${payload.from})`,
  })

  // Financial snapshot — only if at least one numeric field was extracted
  if (parsedData) {
    const { asking_price, noi, cap_rate, irr, square_footage, year_built, num_units, occupancy_rate } = parsedData
    if (asking_price !== null || noi !== null || cap_rate !== null || irr !== null ||
        square_footage !== null || year_built !== null || num_units !== null || occupancy_rate !== null) {
      const { error: snapErr } = await supabase.from('deal_financial_snapshots').insert({
        deal_id:        dealId,
        firm_id:        firmId,
        purchase_price: asking_price,
        noi,
        cap_rate,
        irr,
        square_footage,
        year_built,
        num_units,
        occupancy_rate,
        created_by:     actorId,
      })
      if (snapErr) {
        console.error('[inbox] snapshot insert failed:', snapErr.message)
      }
    }
  }

  // Record uploaded file
  await supabase.from('deal_files').insert({
    deal_id:      dealId,
    firm_id:      firmId,
    storage_path: storagePath,
    filename:     attachment.filename ?? safeFilename,
    mime_type:    'application/pdf',
    size_bytes:   buffer.length,
    uploaded_by:  actorId,
  })

  await supabase.from('deal_events').insert({
    deal_id:       dealId,
    firm_id:       firmId,
    actor_user_id: actorId,
    event_type:    'file_added',
    notes:         attachment.filename ?? safeFilename,
  })

  // Create or reuse broker contact and link as source
  if (brokerName) {
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('firm_id', firmId)
      .eq('name', brokerName)
      .maybeSingle()

    let contactId = existing?.id ?? null

    if (!existing) {
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          firm_id:      firmId,
          name:         brokerName,
          email:        fromEmail,
          company:      brokerCompany,
          contact_type: 'broker',
          created_by:   actorId,
        })
        .select('id')
        .single()
      contactId = newContact?.id ?? null
    }

    if (contactId) {
      await supabase.from('deal_contacts').insert({
        deal_id:    dealId,
        contact_id: contactId,
        firm_id:    firmId,
        is_source:  true,
      })
    }
  }

  const scoreResult = await scoreInboundDeal(supabase, dealId, firmId)
  if (scoreResult.error) {
    console.error('[inbox] automatic scoring failed:', scoreResult.error)
  } else {
    console.log('[inbox] automatic scores created:', scoreResult.scoresWritten)
  }

  return { id: dealId, title: dealTitle }
}

// ── Notification email to firm members ───────────────────────────────────────

async function notifyFirmMembers({
  supabase,
  firm,
  createdDeals,
  payload,
}: {
  supabase: ReturnType<typeof createAdminClient>
  firm: { id: string; name: string }
  createdDeals: Array<{ id: string; title: string }>
  payload: ResendInboundPayload
}) {
  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('firm_id', firm.id)

  const emails = (members ?? [])
    .map((m: any) => m.email as string | null)
    .filter((e): e is string => !!e)

  if (emails.length === 0) {
    console.log('[inbox] no member emails found — skipping notification')
    return
  }

  const count = createdDeals.length
  const dealListHtml = createdDeals
    .map(d => `<li style="padding:4px 0;color:#111827;font-size:14px;">${esc(d.title)}</li>`)
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 0;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Dealstash</p>
              <h1 style="margin:0 0 24px;font-size:20px;font-weight:600;color:#111827;">
                ${count === 1 ? 'New deal from your inbox' : `${count} new deals from your inbox`}
              </h1>
              <p style="margin:0 0 8px;font-size:14px;color:#374151;">
                A broker sent an OM to your firm's Dealstash inbox and it was automatically added to your pipeline.
              </p>
              <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;margin:16px 0 24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#9ca3af;">From</p>
                    <p style="margin:0 0 12px;font-size:14px;color:#111827;">${esc(payload.from)}</p>
                    <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#9ca3af;">Subject</p>
                    <p style="margin:0;font-size:14px;color:#111827;">${esc(payload.subject ?? '(no subject)')}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;">Deal${count > 1 ? 's' : ''} created:</p>
              <ul style="margin:0 0 24px;padding-left:20px;">${dealListHtml}</ul>
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#111827;border-radius:6px;">
                    <a href="${APP_URL}/pipeline" style="display:inline-block;padding:10px 20px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;">
                      View pipeline →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Sent to all members of <strong>${esc(firm.name)}</strong> because your firm has email inbox intake enabled.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const subject = count === 1
    ? `New deal auto-created: "${createdDeals[0].title}"`
    : `${count} new deals auto-created from your inbox`

  await Promise.all(
    emails.map(email =>
      getResend().emails.send({ from: FROM_EMAIL, to: email, subject, html })
    )
  )

  console.log('[inbox] notification sent to', emails.length, 'member(s)')
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
