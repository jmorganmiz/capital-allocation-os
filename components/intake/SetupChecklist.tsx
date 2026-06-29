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

  return (
    <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Set up your workspace</h2>
          <p className="mt-0.5 text-xs text-gray-500">{completeCount} of {items.length} complete</p>
        </div>
        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full bg-blue-600" style={{ width: `${(completeCount / items.length) * 100}%` }} />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map(item => (
          <div key={item.label} className={`rounded-lg border p-3 ${item.complete ? 'border-green-100 bg-green-50' : 'border-gray-200'}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${item.complete ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {item.complete ? '✓' : '·'}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{item.description}</p>
                {!item.complete && <Link href={item.href} className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline">{item.action}</Link>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
