'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { retryInboundEmail } from '@/lib/actions/intake'
import { showToast } from '@/lib/toast'

export type IntakeEvent = {
  id: string
  status: string
  attempts: number
  last_error: string | null
  received_at: string
  processed_at: string | null
  sender: string | null
  subject: string | null
  attachment_count: number
  deal_ids: string[]
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function failureCopy(code: string | null) {
  const labels: Record<string, string> = {
    attachment_processing_failed: 'OM processing failed',
    attachment_download_failed: 'PDF download failed',
    attachment_list_failed: 'Attachment lookup failed',
    no_pdf_attachment: 'No usable PDF attached',
    email_retrieval_failed: 'Email retrieval failed',
  }
  return labels[code ?? ''] ?? 'Processing needs attention'
}

export default function IntakeHealthLog({ events }: { events: IntakeEvent[] }) {
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function retry(eventId: string) {
    setRetryingId(eventId)
    startTransition(async () => {
      const result = await retryInboundEmail(eventId)
      setRetryingId(null)
      if (result.error) showToast(result.error, 'error')
      else showToast('Email reprocessed successfully.', 'success')
    })
  }

  return (
    <section className="app-intake-panel app-intake-health">
      <div className="app-intake-recent-header">
        <div>
          <p className="app-intake-kicker">Delivery health</p>
          <h2>Email intake log</h2>
          <p>Every matched firm email, its processing result, and any action required.</p>
        </div>
        <span>{events.length} recent</span>
      </div>

      {events.length === 0 ? (
        <div className="app-intake-empty app-intake-health-empty">
          <p>No firm emails received yet</p>
          <span>Your first forwarded OM will appear here with a visible processing trail.</span>
        </div>
      ) : (
        <div className="app-intake-health-list">
          {events.map(event => {
            const failed = event.status === 'failed'
            const processing = event.status === 'processing'
            const dealId = event.deal_ids?.[0]
            return (
              <article key={event.id} className="app-intake-health-row" data-status={event.status}>
                <div className="app-intake-health-status" aria-label={event.status} />
                <div className="app-intake-health-message">
                  <strong>{event.subject || 'No subject'}</strong>
                  <span>{event.sender || 'Sender unavailable'} · {formatDate(event.received_at)}</span>
                </div>
                <div className="app-intake-health-outcome">
                  <strong>{failed ? failureCopy(event.last_error) : processing ? 'Processing' : `${event.attachment_count} PDF${event.attachment_count === 1 ? '' : 's'} processed`}</strong>
                  <span>{event.attempts > 1 ? `${event.attempts} attempts` : failed ? 'Action required' : 'Delivered to pipeline'}</span>
                </div>
                <div className="app-intake-health-action">
                  {dealId && !failed ? <Link href={`/deals/${dealId}`}>Open deal</Link> : null}
                  {failed ? (
                    <button type="button" onClick={() => retry(event.id)} disabled={isPending && retryingId === event.id}>
                      {isPending && retryingId === event.id ? 'Retrying…' : 'Retry'}
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
