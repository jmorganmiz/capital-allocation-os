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

const EVENT_STYLES: Record<string, { label: string; dot: string }> = {
  deal_created:  { label: 'Deal Created',    dot: 'bg-blue-500'   },
  stage_changed: { label: 'Stage Changed',   dot: 'bg-gray-400'   },
  killed:        { label: 'Deal Killed',     dot: 'bg-red-500'    },
  note_added:    { label: 'Note Updated',    dot: 'bg-green-400'  },
  file_added:    { label: 'File Uploaded',   dot: 'bg-purple-400' },
}

function fmt(n: number | null, type: 'currency' | 'percent' | 'raw'): string | null {
  if (n == null) return null
  if (type === 'currency') return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (type === 'percent') return (n * 100).toFixed(2) + '%'
  return String(n)
}

// Find the snapshot created closest to (and after) a given ISO timestamp, within 10 seconds
function findKillSnapshot(snapshots: SnapshotRow[], eventCreatedAt: string): SnapshotRow | null {
  const eventMs = new Date(eventCreatedAt).getTime()
  let best: SnapshotRow | null = null
  let bestDiff = Infinity
  for (const s of snapshots) {
    const diff = Math.abs(new Date(s.created_at).getTime() - eventMs)
    if (diff < bestDiff && diff < 10_000) {
      bestDiff = diff
      best = s
    }
  }
  return best
}

export default function DecisionLog({ events, snapshots = [] }: Props) {
  if (events.length === 0) {
    return (
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Decision Log</h2>
        <p className="text-sm text-gray-400">No events yet.</p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 mb-4">Decision Log</h2>
      <div className="relative border-l-2 border-gray-100 pl-5 space-y-5">
        {events.map(event => {
          const style = EVENT_STYLES[event.event_type] ?? { label: event.event_type, dot: 'bg-gray-300' }
          const actor = event.profiles?.full_name ?? 'Unknown'
          const killSnapshot = event.event_type === 'killed'
            ? findKillSnapshot(snapshots, event.created_at)
            : null

          return (
            <div key={event.id} className="relative">
              <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-white ${style.dot}`} />
              <div className="bg-white border border-gray-100 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">{style.label}</span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </span>
                </div>
                {event.event_type === 'stage_changed' && event.from_stage && event.to_stage && (
                  <p className="text-xs text-gray-500 mb-1">
                    {event.from_stage.name} → {event.to_stage.name}
                  </p>
                )}
                {event.event_type === 'killed' && event.kill_reasons && (
                  <p className="text-xs font-medium text-red-700 mb-1">
                    Reason: {event.kill_reasons.name}
                  </p>
                )}
                {event.notes && event.event_type !== 'note_added' && event.event_type !== 'file_added' && (
                  <p className="text-xs text-gray-600 italic">"{event.notes}"</p>
                )}
                {event.event_type === 'file_added' && event.notes && (
                  <p className="text-xs text-gray-500">{event.notes}</p>
                )}
                {killSnapshot && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-1 font-medium">Snapshot at time of kill</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      {fmt(killSnapshot.purchase_price, 'currency') && (
                        <span className="text-xs text-gray-600">Price: {fmt(killSnapshot.purchase_price, 'currency')}</span>
                      )}
                      {fmt(killSnapshot.noi, 'currency') && (
                        <span className="text-xs text-gray-600">NOI: {fmt(killSnapshot.noi, 'currency')}</span>
                      )}
                      {fmt(killSnapshot.cap_rate, 'percent') && (
                        <span className="text-xs text-gray-600">Cap: {fmt(killSnapshot.cap_rate, 'percent')}</span>
                      )}
                      {fmt(killSnapshot.debt_rate, 'percent') && (
                        <span className="text-xs text-gray-600">Debt: {fmt(killSnapshot.debt_rate, 'percent')}</span>
                      )}
                      {fmt(killSnapshot.ltv, 'percent') && (
                        <span className="text-xs text-gray-600">LTV: {fmt(killSnapshot.ltv, 'percent')}</span>
                      )}
                      {fmt(killSnapshot.irr, 'percent') && (
                        <span className="text-xs text-gray-600">IRR: {fmt(killSnapshot.irr, 'percent')}</span>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">by {actor}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
