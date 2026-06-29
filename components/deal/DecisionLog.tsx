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
  to_stage:   { name: string } | null
}

interface SnapshotRow {
  id: string; created_at: string
  purchase_price: number | null; noi: number | null; cap_rate: number | null
  debt_rate: number | null; ltv: number | null; irr: number | null
}

interface Props {
  events: EventRow[]
  snapshots?: SnapshotRow[]
}

const EVENT_META: Record<string, { label: string; color: string }> = {
  deal_created:  { label: 'Deal Created',  color: 'var(--mercury-blue)' },
  stage_changed: { label: 'Stage Changed', color: 'var(--lead)'         },
  killed:        { label: 'Deal Killed',   color: '#f87171'             },
  note_added:    { label: 'Note Updated',  color: '#4ade80'             },
  file_added:    { label: 'File Uploaded', color: '#c084fc'             },
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
  for (const s of snapshots) {
    const diff = Math.abs(new Date(s.created_at).getTime() - eventMs)
    if (diff < bestDiff && diff < 10_000) { bestDiff = diff; best = s }
  }
  return best
}

export default function DecisionLog({ events, snapshots = [] }: Props) {
  if (events.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Activity</h2>
        <p style={{ fontSize: '13px', color: 'var(--lead)' }}>No activity yet.</p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">Activity</h2>

      <div style={{ position: 'relative', paddingLeft: '20px', borderLeft: '1px solid rgba(112,112,125,0.15)' }}>
        {events.map((event, i) => {
          const meta = EVENT_META[event.event_type] ?? { label: event.event_type, color: 'var(--lead)' }
          const actor = event.profiles?.full_name ?? 'Unknown'
          const killSnapshot = event.event_type === 'killed' ? findKillSnapshot(snapshots, event.created_at) : null

          return (
            <div key={event.id} style={{ position: 'relative', marginBottom: i < events.length - 1 ? '16px' : 0 }}>
              {/* Timeline dot */}
              <div style={{
                position: 'absolute',
                left: '-26px',
                top: '14px',
                width: '9px', height: '9px',
                borderRadius: '50%',
                background: meta.color,
                border: '2px solid var(--deep-space)',
                flexShrink: 0,
              }} />

              <div style={{
                background: 'var(--midnight-slate)',
                border: '1px solid rgba(112,112,125,0.15)',
                borderRadius: '8px',
                padding: '12px 16px',
              }}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--starlight)' }}>{meta.label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--lead)' }}>
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </span>
                </div>

                {event.event_type === 'stage_changed' && event.from_stage && event.to_stage && (
                  <p style={{ fontSize: '12px', color: 'var(--silver)', marginBottom: '4px' }}>
                    {event.from_stage.name} → {event.to_stage.name}
                  </p>
                )}
                {event.event_type === 'killed' && event.kill_reasons && (
                  <p style={{ fontSize: '12px', color: '#f87171', fontWeight: 500, marginBottom: '4px' }}>
                    Reason: {event.kill_reasons.name}
                  </p>
                )}
                {event.notes && event.event_type !== 'note_added' && event.event_type !== 'file_added' && (
                  <p style={{ fontSize: '12px', color: 'var(--silver)', fontStyle: 'italic' }}>"{event.notes}"</p>
                )}
                {event.event_type === 'file_added' && event.notes && (
                  <p style={{ fontSize: '12px', color: 'var(--silver)' }}>{event.notes}</p>
                )}

                {killSnapshot && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(112,112,125,0.12)' }}>
                    <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--lead)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Snapshot at kill</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {[
                        { l: 'Price', v: fmt(killSnapshot.purchase_price, 'currency') },
                        { l: 'NOI',   v: fmt(killSnapshot.noi, 'currency') },
                        { l: 'Cap',   v: fmt(killSnapshot.cap_rate, 'percent') },
                        { l: 'Debt',  v: fmt(killSnapshot.debt_rate, 'percent') },
                        { l: 'LTV',   v: fmt(killSnapshot.ltv, 'percent') },
                        { l: 'IRR',   v: fmt(killSnapshot.irr, 'percent') },
                      ].filter(x => x.v).map(({ l, v }) => (
                        <span key={l} style={{ fontSize: '11px', color: 'var(--silver)' }}>{l}: {v}</span>
                      ))}
                    </div>
                  </div>
                )}

                <p style={{ fontSize: '11px', color: 'var(--lead)', marginTop: '8px' }}>by {actor}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
