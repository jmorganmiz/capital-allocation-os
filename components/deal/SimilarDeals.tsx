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
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400">—</span>
  const color = score >= 70 ? '#4ade80' : score >= 45 ? '#fbbf24' : '#f87171'
  return (
    <span style={{ color, fontSize: '13px', fontWeight: 700 }}>{score}</span>
  )
}

function StageBadge({ stageName, isArchived }: { stageName: string | null; isArchived: boolean }) {
  if (isArchived) {
    return (
      <span style={{
        fontSize: '11px', fontWeight: 600,
        padding: '3px 8px', borderRadius: '999px',
        background: 'rgba(239,68,68,0.12)',
        border: '1px solid rgba(239,68,68,0.2)',
        color: '#f87171',
        whiteSpace: 'nowrap',
      }}>
        Killed
      </span>
    )
  }
  return (
    <span style={{
      fontSize: '11px', fontWeight: 500,
      padding: '3px 8px', borderRadius: '999px',
      background: 'rgba(112,112,125,0.12)',
      border: '1px solid rgba(112,112,125,0.2)',
      color: 'var(--silver)',
      whiteSpace: 'nowrap',
    }}>
      {stageName ?? 'Unknown'}
    </span>
  )
}

function MatchTag({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 600,
      padding: '2px 7px', borderRadius: '999px',
      background: 'rgba(82,102,235,0.1)',
      border: '1px solid rgba(82,102,235,0.2)',
      color: 'var(--ghost-blue)',
      letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
    }}>
      {label}
    </span>
  )
}

export default function SimilarDeals({ deals, currentDealType, currentMarket }: Props) {
  if (deals.length === 0) {
    return (
      <div className="border border-dashed border-gray-200 rounded-lg p-10 text-center text-sm text-gray-400">
        No similar deals found yet. As your pipeline grows, comparable deals will appear here.
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
      {deals.map(deal => {
        const matchLabels: string[] = []
        if (currentDealType && deal.deal_type === currentDealType) matchLabels.push(deal.deal_type!)
        if (currentMarket && deal.market === currentMarket) matchLabels.push(deal.market!)
        if (deal.asking_price_match) matchLabels.push('similar price')

        return (
          <div key={deal.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex-1 min-w-0">
              <Link
                href={`/deals/${deal.id}`}
                className="text-sm font-medium text-gray-900 hover:text-blue-700 transition-colors leading-snug block truncate"
              >
                {deal.title}
              </Link>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {matchLabels.map(label => <MatchTag key={label} label={label} />)}
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-gray-400 mb-0.5">Score</div>
                <ScoreBadge score={deal.score} />
              </div>
              <StageBadge stageName={deal.stage_name} isArchived={deal.is_archived} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
