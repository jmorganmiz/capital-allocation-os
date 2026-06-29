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
  const reviewIds = new Set(needsReview.map(d => d.id))
  const items = [...needsReview, ...staleDeals.filter(d => !reviewIds.has(d.id))].slice(0, 6)

  return (
    <section className="app-dashboard-panel app-dashboard-attention-panel">
      <div className="app-dashboard-panel-header">
        <div>
          <p className="app-dashboard-kicker">Needs attention</p>
          <h2>Review queue</h2>
        </div>
        <Link href="/intake">Open intake</Link>
      </div>

      <div className="app-dashboard-attention-summary">
        <div data-tone={needsReview.length > 0 ? 'blue' : 'neutral'}>
          <p>{needsReview.length}</p>
          <strong>New deals to review</strong>
          <span>New-stage deals without a completed score.</span>
        </div>
        <div data-tone={staleDeals.length > 0 ? 'amber' : 'neutral'}>
          <p>{staleDeals.length}</p>
          <strong>Stale deals</strong>
          <span>Active deals without an update in 7 days.</span>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="app-dashboard-attention-list">
          {items.map((deal, i) => (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className="app-dashboard-attention-row"
              style={{ borderTop: i > 0 ? '1px solid rgba(112,112,125,0.1)' : 'none' }}
            >
              <span>{deal.title}</span>
              <em data-tone={reviewIds.has(deal.id) ? 'blue' : 'amber'}>
                {reviewIds.has(deal.id) ? 'Review' : 'Stale'}
              </em>
            </Link>
          ))}
        </div>
      ) : (
        <div className="app-dashboard-empty compact">
          <p>Nothing urgent.</p>
          <span>New and stale deals will surface here automatically.</span>
        </div>
      )}
    </section>
  )
}
