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
  sidebar?: boolean
}

function scoreTone(score: number): 'green' | 'amber' | 'red' {
  if (score >= 70) return 'green'
  if (score >= 45) return 'amber'
  return 'red'
}

function EmptySimilarDeals() {
  return (
    <div className="app-similar-empty">
      <strong>No matches yet</strong>
      <span>
        Similar deals will appear here once this firm has reviewed matching market or asset-type opportunities.
      </span>
    </div>
  )
}

export default function SimilarDeals({ deals, currentDealType, currentMarket, sidebar = false }: Props) {
  if (deals.length === 0) return <EmptySimilarDeals />

  if (sidebar) {
    return (
      <div className="app-similar-list compact">
        {deals.map((deal) => (
          <Link key={deal.id} href={`/deals/${deal.id}`} className="app-similar-card">
            <div>
              <strong>{deal.title}</strong>
              <span>
                {[deal.market, deal.deal_type].filter(Boolean).join(' · ') || 'Deal memory'}
              </span>
            </div>
            <div className="app-similar-card-meta">
              {deal.score !== null && <em data-tone={scoreTone(deal.score)}>{deal.score}</em>}
              {deal.is_archived
                ? <small data-tone="red">Killed</small>
                : deal.stage_name ? <small>{deal.stage_name}</small> : null}
            </div>
          </Link>
        ))}
      </div>
    )
  }

  return (
    <div className="app-similar-list">
      {deals.map((deal) => {
        const matchLabels: string[] = []
        if (currentDealType && deal.deal_type === currentDealType) matchLabels.push(deal.deal_type)
        if (currentMarket && deal.market === currentMarket) matchLabels.push(deal.market)
        if (deal.asking_price_match) matchLabels.push('similar price')

        return (
          <Link key={deal.id} href={`/deals/${deal.id}`} className="app-similar-card wide">
            <div>
              <strong>{deal.title}</strong>
              <span>
                {matchLabels.length > 0 ? matchLabels.join(' · ') : 'Related deal'}
              </span>
            </div>
            <div className="app-similar-card-meta">
              {deal.score !== null && <em data-tone={scoreTone(deal.score)}>{deal.score}</em>}
              {deal.is_archived
                ? <small data-tone="red">Killed</small>
                : <small>{deal.stage_name ?? 'Active'}</small>}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
