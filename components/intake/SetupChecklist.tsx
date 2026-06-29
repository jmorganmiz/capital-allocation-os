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
    <section style={{ background: '#1e1e2a', border: '1px solid rgba(112,112,125,0.18)', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#ededf3' }}>Set up your workspace</h2>
          <p style={{ fontSize: '11px', color: '#70707d', marginTop: '2px' }}>{completeCount} of {items.length} complete</p>
        </div>
        <div style={{ width: '80px', height: '4px', background: 'rgba(112,112,125,0.2)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: '#5266eb', borderRadius: '999px', transition: 'width 0.3s ease' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {items.map(item => (
          <div
            key={item.label}
            style={{
              borderRadius: '6px',
              padding: '12px 16px',
              background: item.complete ? 'rgba(34,197,94,0.06)' : '#272735',
              border: item.complete ? '1px solid rgba(34,197,94,0.15)' : '1px solid rgba(112,112,125,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{
                width: '18px', height: '18px', fontSize: '10px', fontWeight: 700,
                background: item.complete ? 'rgba(34,197,94,0.9)' : 'rgba(112,112,125,0.2)',
                color: item.complete ? '#fff' : '#70707d',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: '1px',
              }}>
                {item.complete ? '✓' : '·'}
              </span>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 500, color: item.complete ? '#c3c3cc' : '#ededf3' }}>{item.label}</p>
                <p style={{ fontSize: '11px', color: '#70707d', marginTop: '2px', lineHeight: 1.5 }}>{item.description}</p>
                {!item.complete && (
                  <Link href={item.href} style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', fontWeight: 600, color: '#5266eb' }}>
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
