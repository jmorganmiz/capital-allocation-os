import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { getResend } from '@/lib/resend'
import { getAccessState } from '@/lib/workflow.mjs'
import { matchAgainstBuyBoxes, normalizeKey } from '@/lib/sourcing-match.mjs'

export const runtime = 'nodejs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.getdealstash.com'
const FROM_EMAIL = 'team@getdealstash.com'

function field(body: Record<string, unknown>, key: string, max: number) {
  const value = body[key]
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function requestIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
}

function rateIdentifier(scope: string, value: string) {
  const salt = process.env.DEMO_ANALYST_RATE_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dealstash-portal'
  return createHash('sha256').update(`${salt}:${scope}:${value}`).digest('hex')
}

export async function POST(request: NextRequest) {
  const body: Record<string, unknown> = await request.json().catch(() => ({}))

  // Honeypot: real brokers never see this field. Pretend success for bots.
  if (typeof body.website === 'string' && body.website.trim()) {
    return NextResponse.json({ ok: true })
  }

  const slug = field(body, 'slug', 120)
  const brokerName = field(body, 'brokerName', 120)
  const brokerEmail = field(body, 'brokerEmail', 200).toLowerCase()
  const brokerCompany = field(body, 'brokerCompany', 160)
  const brokerMessage = field(body, 'brokerMessage', 2000)
  const propertyName = field(body, 'propertyName', 200)
  const address = field(body, 'address', 300)
  const market = field(body, 'market', 160)
  const assetType = field(body, 'assetType', 120)
  const sourceUrl = field(body, 'sourceUrl', 2000)
  const askingPriceRaw = Number(String(body.askingPrice ?? '').replace(/[^0-9.]/g, ''))
  const askingPrice = Number.isFinite(askingPriceRaw) && askingPriceRaw > 0 ? askingPriceRaw : null
  const unitCountRaw = Number(String(body.unitCount ?? '').replace(/[^0-9]/g, ''))
  const unitCount = Number.isFinite(unitCountRaw) && unitCountRaw > 0 ? Math.round(unitCountRaw) : null

  if (!slug || !brokerName || !propertyName || !brokerEmail.includes('@')) {
    return NextResponse.json({ error: 'Your name, email, and the property name are required.' }, { status: 400 })
  }
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
    return NextResponse.json({ error: 'Listing links must start with http:// or https://.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: firm } = await admin
    .from('firms')
    .select('id, name, inbox_email, broker_portal_enabled, trial_ends_at, stripe_subscription_status')
    .eq('inbox_slug', slug)
    .maybeSingle()

  const access = firm ? getAccessState({ trialEndsAt: firm.trial_ends_at, subscriptionStatus: firm.stripe_subscription_status }) : null
  if (!firm || !firm.broker_portal_enabled || !access?.allowed) {
    return NextResponse.json({ error: 'This firm is not accepting submissions right now.' }, { status: 404 })
  }

  // Per-IP and per-firm rate limits share the demo analyst window RPC.
  const [{ data: ipAllowed, error: ipError }, { data: firmAllowed, error: firmError }] = await Promise.all([
    admin.rpc('consume_demo_analyst_rate', { p_identifier: rateIdentifier('portal-ip', requestIp(request)), p_limit: 5, p_window_seconds: 3600 }),
    admin.rpc('consume_demo_analyst_rate', { p_identifier: rateIdentifier('portal-firm', firm.id), p_limit: 50, p_window_seconds: 86_400 }),
  ])
  if (ipError || firmError) {
    return NextResponse.json({ error: 'Submissions are temporarily unavailable. Please try again shortly.' }, { status: 503 })
  }
  if (!ipAllowed || !firmAllowed) {
    return NextResponse.json({ error: 'Submission limit reached. Please try again later or email the deal instead.' }, { status: 429 })
  }

  const [{ data: memberRows }, { data: deals }, { data: boxes }] = await Promise.all([
    admin.from('profiles').select('id').eq('firm_id', firm.id).order('created_at', { ascending: true }).limit(1),
    admin.from('deals').select('id, title, address').eq('firm_id', firm.id).limit(1000),
    admin.from('buy_boxes').select('id, asset_type, preferred_markets, max_asking_price').eq('firm_id', firm.id),
  ])
  const capturedBy = memberRows?.[0]?.id
  if (!capturedBy) {
    return NextResponse.json({ error: 'This firm is not accepting submissions right now.' }, { status: 404 })
  }

  const duplicate = (deals ?? []).find((deal) => address && normalizeKey(deal.address ?? '') === normalizeKey(address))
    ?? (deals ?? []).find((deal) => normalizeKey(deal.title) === normalizeKey(propertyName))
  const { box, score, reasons } = matchAgainstBuyBoxes(boxes ?? [], { assetType, market, askingPrice, address, unitCount })
  if (duplicate) reasons.unshift('Possible duplicate in firm memory')
  reasons.push(`Submitted by ${brokerName}${brokerCompany ? ` (${brokerCompany})` : ''} via broker portal`)

  const { error: insertError } = await admin.from('sourcing_opportunities').insert({
    firm_id: firm.id,
    source_type: 'broker_portal',
    source_url: sourceUrl || null,
    source_key: `portal:${normalizeKey(address || propertyName)}`,
    property_name: propertyName,
    address: address || null,
    market: market || null,
    asset_type: assetType || null,
    asking_price: askingPrice,
    unit_count: unitCount,
    status: box ? 'matched' : 'new',
    buy_box_id: box?.id ?? null,
    match_score: score,
    match_reasons: reasons,
    possible_duplicate_deal_id: duplicate?.id ?? null,
    broker_name: brokerName,
    broker_email: brokerEmail,
    broker_company: brokerCompany || null,
    broker_message: brokerMessage || null,
    captured_by: capturedBy,
  })

  if (insertError) {
    if (insertError.code === '23505') {
      // Already submitted — tell the broker it is in review rather than erroring.
      return NextResponse.json({ ok: true, note: 'This property is already with the team for review.' })
    }
    console.error('[portal] submission insert failed:', insertError.code)
    return NextResponse.json({ error: 'Could not record the submission. Please try again.' }, { status: 500 })
  }

  try {
    const { data: members } = await admin.from('profiles').select('email').eq('firm_id', firm.id)
    const emails = (members ?? []).map((m) => m.email as string | null).filter((e): e is string => !!e)
    await Promise.all(emails.map((email) => getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `New broker submission: ${propertyName}`,
      text: [
        `${brokerName}${brokerCompany ? ` (${brokerCompany})` : ''} submitted a deal through your broker portal.`,
        '',
        `Property: ${propertyName}`,
        address ? `Address: ${address}` : null,
        market ? `Market: ${market}` : null,
        assetType ? `Asset type: ${assetType}` : null,
        askingPrice ? `Asking price: $${askingPrice.toLocaleString()}` : null,
        `Broker contact: ${brokerEmail}`,
        brokerMessage ? `Message: ${brokerMessage}` : null,
        '',
        `Review it in Property Finder: ${APP_URL}/sourcing`,
      ].filter((line) => line !== null).join('\n'),
    })))
  } catch (err) {
    console.error('[portal] notification failed:', err instanceof Error ? err.message : 'unknown error')
  }

  return NextResponse.json({ ok: true })
}
