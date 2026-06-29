import Link from 'next/link'

interface SimilarDeal {
  id: string
  title: string
  market: string | null
  deal_type: string | null
  asking_price: number | null
  is_archived: boolean
  stage_name: string | null
  score: number | null
  match_type: string
  asking_price_match: boolean
}

interface Props {
  deals: SimilarDeal[]
  currentDealType: string | null
  currentMarket: string | null
  /** When true renders as a compact sidebar panel instead of full-width rows */
  sidebar?: boolean
}

function scoreColor(s: number) {
  return s >= 70 ? '#4ade80' : s >= 45 ? '#fbbf24' : '#f87171'
}

function scoreBg(s: number) {
  return s >= 70
    ? { bg: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }
    : s >= 45
    ? { bg: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }
    : { bg: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }
}

export default function SimilarDeals({ deals, currentDealType, currentMarket, sidebar = false }: Props) {
  if (deals.length === 0) {
    return (
      <div className="rounded-lg p-6 text-center" style={{ border: '1px dashed rgba(112,112,125,0.22)' }}>
        <p style={{ fontSize: '12px', color: 'var(--lead)' }}>
          No similar deals yet — they'll appear as your pipeline grows.
        </p>
      </div>
    )
  }

  if (sidebar) {
    return (
      <div className="flex flex-col gap-2">
        {deals.map(deal => {
          const sc = scoreBg(deal.score ?? 0)
          return (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className="block rounded-lg p-3 transition-colors"
              style={{ background: 'var(--graphite)', border: '1px solid rgba(112,112,125,0.18)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(82,102,235,0.35)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(112,112,125,0.18)')}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--starlight)', lineHeight: 1.3 }}>
                  {deal.title}
                </span>
                {deal.score !== null && (
                  <span style={{
                    fontSize: '11px', fontWeight: 700, flexShrink: 0,
                    color: scoreColor(deal.score),
                    background: sc.bg, border: sc.border,
                    borderRadius: '999px', padding: '1px 6px',
                  }}>
                    {deal.score}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {deal.market && <span style={{ fontSize: '10px', color: 'var(--lead)' }}>{deal.market}</span>}
                {deal.is_archived ? (
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '999px', padding: '1px 6px' }}>Killed</span>
                ) : deal.stage_name ? (
                  <span style={{ fontSize: '10px', color: 'var(--lead)', background: 'rgba(112,112,125,0.1)', border: '1px solid rgba(112,112,125,0.15)', borderRadius: '999px', padding: '1px 6px' }}>{deal.stage_name}</span>
                ) : null}
              </div>
            </Link>
          )
        })}
      </div>
    )
  }

  // Full-width fallback (kept for any non-sidebar usage)
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(112,112,125,0.18)' }}>
      {deals.map((deal, i) => {
        const matchLabels: string[] = []
        if (currentDealType && deal.deal_type === currentDealType) matchLabels.push(deal.deal_type!)
        if (currentMarket && deal.market === currentMarket) matchLabels.push(deal.market!)
        if (deal.asking_price_match) matchLabels.push('similar price')
        const sc = deal.score !== null ? scoreBg(deal.score) : null

        return (
          <div key={deal.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors"
            style={{ borderTop: i > 0 ? '1px solid rgba(112,112,125,0.1)' : 'none', background: 'var(--midnight-slate)' }}>
            <div className="flex-1 min-w-0">
              <Link href={`/deals/${deal.id}`} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--starlight)' }}
                className="hover:opacity-70 transition-opacity block truncate">
                {deal.title}
              </Link>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {matchLabels.map(label => (
                  <span key={label} style={{ fontSize: '10px', fontWeight: 600, color: 'var(--ghost-blue)', background: 'rgba(82,102,235,0.1)', border: '1px solid rgba(82,102,235,0.2)', borderRadius: '999px', padding: '1px 7px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {deal.score !== null && sc && (
                <span style={{ fontSize: '12px', fontWeight: 700, color: scoreColor(deal.score), background: sc.bg, border: sc.border, borderRadius: '999px', padding: '2px 8px' }}>{deal.score}</span>
              )}
              {deal.is_archived
                ? <span style={{ fontSize: '11px', fontWeight: 600, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '999px', padding: '2px 8px' }}>Killed</span>
                : <span style={{ fontSize: '11px', color: 'var(--silver)', background: 'rgba(112,112,125,0.1)', border: '1px solid rgba(112,112,125,0.15)', borderRadius: '999px', padding: '2px 8px' }}>{deal.stage_name ?? '—'}</span>
              }
            </div>
          </div>
        )
      })}
    </div>
  )
}
