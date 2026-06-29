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
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--lead)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Needs attention</h2>
        <Link href="/intake" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--mercury-blue)' }}>Open intake</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 mb-3">
        <div className="rounded-lg p-5" style={{
          background: needsReview.length > 0 ? 'rgba(82,102,235,0.08)' : 'var(--midnight-slate)',
          border: needsReview.length > 0 ? '1px solid rgba(82,102,235,0.25)' : '1px solid rgba(112,112,125,0.2)',
          boxShadow: 'var(--card-shadow)',
        }}>
          <p style={{ fontSize: '28px', fontWeight: 700, color: needsReview.length > 0 ? 'var(--mercury-blue)' : 'var(--lead)', lineHeight: 1 }}>{needsReview.length}</p>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--starlight)', marginTop: '6px' }}>New deals to review</p>
          <p style={{ fontSize: '11px', color: 'var(--lead)', marginTop: '3px' }}>New-stage deals without a completed score.</p>
        </div>
        <div className="rounded-lg p-5" style={{
          background: staleDeals.length > 0 ? 'rgba(245,158,11,0.06)' : 'var(--midnight-slate)',
          border: staleDeals.length > 0 ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(112,112,125,0.2)',
          boxShadow: 'var(--card-shadow)',
        }}>
          <p style={{ fontSize: '28px', fontWeight: 700, color: staleDeals.length > 0 ? '#fbbf24' : 'var(--lead)', lineHeight: 1 }}>{staleDeals.length}</p>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--starlight)', marginTop: '6px' }}>Stale deals</p>
          <p style={{ fontSize: '11px', color: 'var(--lead)', marginTop: '3px' }}>Active deals without an update in 7 days.</p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(112,112,125,0.18)', boxShadow: 'var(--card-shadow)' }}>
          {items.map((deal, i) => (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className="flex items-center justify-between px-5 py-3.5 transition-colors"
              style={{
                borderTop: i > 0 ? '1px solid rgba(112,112,125,0.1)' : 'none',
                background: 'var(--midnight-slate)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--graphite)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--midnight-slate)')}
            >
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--starlight)' }}>{deal.title}</span>
              <span style={{
                fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: reviewIds.has(deal.id) ? 'var(--mercury-blue)' : '#fbbf24',
                background: reviewIds.has(deal.id) ? 'rgba(82,102,235,0.1)' : 'rgba(245,158,11,0.1)',
                border: reviewIds.has(deal.id) ? '1px solid rgba(82,102,235,0.2)' : '1px solid rgba(245,158,11,0.2)',
                borderRadius: '999px',
                padding: '2px 8px',
              }}>
                {reviewIds.has(deal.id) ? 'Review' : 'Stale'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
