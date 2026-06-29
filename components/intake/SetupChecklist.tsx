import Link from 'next/link'

interface Item {
  label: string
  description: string
  href: string
  action: string
  complete: boolean
}

export default function SetupChecklist({
  hasInbox,
  hasBuyBox,
  hasDeal,
  hasTeammate,
}: {
  hasInbox: boolean
  hasBuyBox: boolean
  hasDeal: boolean
  hasTeammate: boolean
}) {
  const items: Item[] = [
    { label: 'Firm inbox ready', description: 'Use your dedicated address for broker OMs.', href: '#firm-inbox', action: 'View address', complete: hasInbox },
    { label: 'Define a buy box', description: 'Give AI your markets, return thresholds, and criteria.', href: '/buy-box', action: 'Configure', complete: hasBuyBox },
    { label: 'Add your first deal', description: 'Email, upload, or import an existing pipeline.', href: '/pipeline', action: 'Add deal', complete: hasDeal },
    { label: 'Invite your team', description: 'Bring the investment team into one decision history.', href: '/settings', action: 'Invite', complete: hasTeammate },
  ]
  const completeCount = items.filter(item => item.complete).length
  if (completeCount === items.length) return null

  const pct = (completeCount / items.length) * 100

  return (
    <section className="app-intake-panel app-intake-setup">
      <div className="app-intake-panel-header">
        <div>
          <h2>Set up your workspace</h2>
          <p>{completeCount} of {items.length} complete</p>
        </div>
        <div className="app-intake-progress">
          <div style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="app-intake-checklist-grid">
        {items.map(item => (
          <div
            key={item.label}
            className="app-intake-checklist-item"
            style={{
              background: item.complete ? 'rgba(34,197,94,0.06)' : 'var(--graphite)',
              border: item.complete ? '1px solid rgba(34,197,94,0.18)' : '1px solid rgba(112,112,125,0.15)',
            }}
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 flex-shrink-0 flex items-center justify-center rounded-full"
                style={{
                  width: '18px',
                  height: '18px',
                  fontSize: '10px',
                  fontWeight: 700,
                  background: item.complete ? 'rgba(34,197,94,0.9)' : 'rgba(112,112,125,0.2)',
                  color: item.complete ? '#fff' : 'var(--lead)',
                }}
              >
                {item.complete ? '✓' : '·'}
              </span>
              <div className="min-w-0">
                <p className="app-intake-checklist-title" style={{ color: item.complete ? 'var(--silver)' : 'var(--starlight)' }}>{item.label}</p>
                <p className="app-intake-checklist-copy">{item.description}</p>
                {!item.complete && (
                  <Link href={item.href} className="app-intake-checklist-link">
                    {item.action} →
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
