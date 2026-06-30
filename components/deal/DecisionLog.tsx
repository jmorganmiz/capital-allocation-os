import { formatDistanceToNow } from 'date-fns'

interface EventRow {
  id: string
  event_type: string
  notes: string | null
  created_at: string
  actor_user_id: string
  profiles: { full_name: string | null } | null
  kill_reasons: { name: string } | null
  from_stage: { name: string } | null
  to_stage: { name: string } | null
}

interface SnapshotRow {
  id: string
  created_at: string
  purchase_price: number | null
  noi: number | null
  cap_rate: number | null
  debt_rate: number | null
  ltv: number | null
  irr: number | null
}

interface Props {
  events: EventRow[]
  snapshots?: SnapshotRow[]
}

const EVENT_META: Record<string, { label: string; tone: string }> = {
  deal_created: { label: 'Deal Created', tone: 'blue' },
  stage_changed: { label: 'Stage Changed', tone: 'neutral' },
  killed: { label: 'Deal Killed', tone: 'red' },
  note_added: { label: 'Note Updated', tone: 'green' },
  file_added: { label: 'File Uploaded', tone: 'purple' },
}

function fmt(n: number | null, type: 'currency' | 'percent'): string | null {
  if (n == null) return null
  if (type === 'currency') return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return (n * 100).toFixed(2) + '%'
}

function findKillSnapshot(snapshots: SnapshotRow[], eventCreatedAt: string): SnapshotRow | null {
  const eventMs = new Date(eventCreatedAt).getTime()
  let best: SnapshotRow | null = null
  let bestDiff = Infinity

  for (const snapshot of snapshots) {
    const diff = Math.abs(new Date(snapshot.created_at).getTime() - eventMs)
    if (diff < bestDiff && diff < 10_000) {
      bestDiff = diff
      best = snapshot
    }
  }

  return best
}

export default function DecisionLog({ events, snapshots = [] }: Props) {
  if (events.length === 0) {
    return (
      <>
        <div className="app-deal-section-header">
          <div>
            <p>Decision history</p>
            <h2>Activity</h2>
          </div>
        </div>
        <div className="app-deal-empty">No activity yet.</div>
      </>
    )
  }

  return (
    <>
      <div className="app-deal-section-header">
        <div>
          <p>Decision history</p>
          <h2>Activity</h2>
        </div>
        <span>{events.length} events</span>
      </div>

      <div className="app-deal-timeline">
        {events.map((event) => {
          const meta = EVENT_META[event.event_type] ?? { label: event.event_type, tone: 'neutral' }
          const actor = event.profiles?.full_name ?? 'Unknown'
          const killSnapshot = event.event_type === 'killed' ? findKillSnapshot(snapshots, event.created_at) : null

          return (
            <div key={event.id} className="app-deal-timeline-item" data-tone={meta.tone}>
              <span className="app-deal-timeline-dot" />

              <div className="app-deal-timeline-card">
                <div className="app-deal-timeline-head">
                  <strong>{meta.label}</strong>
                  <span>{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</span>
                </div>

                {event.event_type === 'stage_changed' && event.from_stage && event.to_stage && (
                  <p>{event.from_stage.name} → {event.to_stage.name}</p>
                )}

                {event.event_type === 'killed' && event.kill_reasons && (
                  <p data-tone="red">Reason: {event.kill_reasons.name}</p>
                )}

                {event.notes && event.event_type !== 'note_added' && event.event_type !== 'file_added' && (
                  <blockquote>{event.notes}</blockquote>
                )}

                {event.event_type === 'file_added' && event.notes && (
                  <p>{event.notes}</p>
                )}

                {killSnapshot && (
                  <div className="app-deal-kill-snapshot">
                    <p>Snapshot at kill</p>
                    <div>
                      {[
                        { label: 'Price', value: fmt(killSnapshot.purchase_price, 'currency') },
                        { label: 'NOI', value: fmt(killSnapshot.noi, 'currency') },
                        { label: 'Cap', value: fmt(killSnapshot.cap_rate, 'percent') },
                        { label: 'Debt', value: fmt(killSnapshot.debt_rate, 'percent') },
                        { label: 'LTV', value: fmt(killSnapshot.ltv, 'percent') },
                        { label: 'IRR', value: fmt(killSnapshot.irr, 'percent') },
                      ].filter((item) => item.value).map(({ label, value }) => (
                        <span key={label}>{label}: {value}</span>
                      ))}
                    </div>
                  </div>
                )}

                <small>by {actor}</small>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
