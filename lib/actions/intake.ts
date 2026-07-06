'use server'

import { createClient } from '@/lib/supabase/server'
import { assertFirmAccess } from '@/lib/billing-access'
import { revalidatePath } from 'next/cache'
import { Webhook } from 'standardwebhooks'
import { randomUUID } from 'node:crypto'

const MAX_RETRY_ATTEMPTS = 5

export async function retryInboundEmail(eventId: string) {
  if (!eventId || eventId.length > 500) return { error: 'Invalid intake event.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found.' }

  const accessError = await assertFirmAccess(supabase, profile.firm_id)
  if (accessError) return { error: accessError }

  const { data: event } = await supabase
    .from('inbound_email_events')
    .select('id, status, attempts')
    .eq('id', eventId)
    .eq('firm_id', profile.firm_id)
    .single()

  if (!event) return { error: 'Intake event not found.' }
  if (event.status !== 'failed') return { error: 'Only failed intake events can be retried.' }
  if (event.attempts >= MAX_RETRY_ATTEMPTS) {
    return { error: 'Retry limit reached. Contact support so we can inspect this safely.' }
  }

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  if (!webhookSecret) return { error: 'Email intake is not configured.' }

  const body = JSON.stringify({ type: 'email.received', data: { email_id: event.id } })
  const messageId = `retry_${randomUUID()}`
  const timestamp = new Date()
  const signature = new Webhook(webhookSecret).sign(messageId, timestamp, body)
  const deploymentUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')

  try {
    const response = await fetch(`${deploymentUrl.replace(/\/$/, '')}/api/inbox/inbound`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'svix-id': messageId,
        'svix-timestamp': Math.floor(timestamp.getTime() / 1000).toString(),
        'svix-signature': signature,
      },
      body,
      cache: 'no-store',
    })
    const result = await response.json().catch(() => null) as { error?: string } | null
    if (!response.ok) {
      revalidatePath('/intake')
      return { error: intakeErrorMessage(result?.error) }
    }
  } catch {
    return { error: 'The retry could not reach the intake worker. Try again shortly.' }
  }

  revalidatePath('/intake')
  return { success: true }
}

function intakeErrorMessage(code?: string) {
  const messages: Record<string, string> = {
    email_retrieval_failed: 'The original email is no longer available from the mail provider.',
    attachment_download_failed: 'The PDF could not be downloaded. Ask the sender to forward it again.',
    attachment_list_failed: 'The mail provider could not list the attachments. Try again shortly.',
    no_pdf_attachment: 'No usable PDF was attached. Ask the sender to forward the OM as a PDF.',
    attachment_processing_failed: 'The OM still could not be parsed. Upload it manually or contact support.',
    processing_in_progress: 'This email is already being processed.',
  }
  return messages[code ?? ''] ?? 'The retry did not complete. Try again shortly.'
}
