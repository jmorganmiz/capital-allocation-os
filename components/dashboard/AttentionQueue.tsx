import Link from 'next/link'

interface DealItem {
  id: string
  title: string
}

export default function AttentionQueue({
  needsReview,
  staleDeals,
}: {
  needsReview: DealItem[]
  staleDeals: DealItem[]
}) {
  const reviewIds = new Set(needsReview.map(deal => deal.id))
  const items = [...needsReview, ...staleDeals.filter(deal => !reviewIds.has(deal.id))].slice(0, 6)

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Needs attention</h2>
        <Link href="/intake" className="text-sm font-medium text-blue-600 hover:underline">Open intake</Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-2xl font-bold text-blue-900">{needsReview.length}</p>
          <p className="mt-1 text-sm font-medium text-blue-800">New deals to review</p>
          <p className="mt-1 text-xs text-blue-700/70">New-stage deals from email or without a completed score.</p>
        </div>
        <div className={`rounded-lg border p-4 ${staleDeals.length ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
          <p className={`text-2xl font-bold ${staleDeals.length ? 'text-amber-800' : 'text-gray-900'}`}>{staleDeals.length}</p>
          <p className="mt-1 text-sm font-medium text-gray-800">Stale deals</p>
          <p className="mt-1 text-xs text-gray-500">Active deals without an update in seven days.</p>
        </div>
      </div>
      {items.length > 0 && (
        <div className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {items.map(deal => (
            <Link key={deal.id} href={`/deals/${deal.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <span className="text-sm font-medium text-gray-900">{deal.title}</span>
              <span className="text-xs text-gray-400">{reviewIds.has(deal.id) ? 'Review' : 'Stale'}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
