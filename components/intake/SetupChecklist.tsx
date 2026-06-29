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
    <section className="rounded-xl p-6" style={{ background: 'var(--midnight-slate)', border: '1px solid rgba(112,112,125,0.22)', boxShadow: 'var(--card-shadow)' }}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 650, color: 'var(--starlight)', letterSpacing: '-0.02em' }}>Set up your workspace</h2>
          <p style={{ fontSize: '12px', color: 'var(--lead)', marginTop: '4px' }}>{completeCount} of {items.length} complete</p>
        </div>
        <div className="rounded-full overflow-hidden" style={{ width: '110px', height: '5px', background: 'rgba(112,112,125,0.2)' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--mercury-blue)', borderRadius: '999px', transition: 'width 0.3s ease' }} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(item => (
          <div
            key={item.label}
            className="rounded-xl p-4"
            style={{
              background: item.complete ? 'rgba(34,197,94,0.06)' : 'var(--graphite)',
              border: item.complete ? '1px solid rgba(34,197,94,0.18)' : '1px solid rgba(112,112,125,0.15)',
            }}
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 flex-shrink-0 flex items-center justify-center rounded-full"
                style={{
                  width: '18px', height: '18px', fontSize: '10px', fontWeight: 700,
                  background: item.complete ? 'rgba(34,197,94,0.9)' : 'rgba(112,112,125,0.2)',
                  color: item.complete ? '#fff' : 'var(--lead)',
                }}
              >
                {item.complete ? '✓' : '·'}
              </span>
              <div className="min-w-0">
                <p style={{ fontSize: '13px', fontWeight: 500, color: item.complete ? 'var(--silver)' : 'var(--starlight)' }}>{item.label}</p>
                <p style={{ fontSize: '11px', color: 'var(--lead)', marginTop: '2px', lineHeight: 1.5 }}>{item.description}</p>
                {!item.complete && (
                  <Link href={item.href} style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--mercury-blue)' }}>
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
