import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { reactivateDeal } from '@/lib/actions/deals'

interface SearchParams {
  q?: string
  market?: string
  deal_type?: string
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function GraveyardPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()

  const { data: dealsData } = await supabase
    .from('deals')
    .select('id, title, market, deal_type, archived_at, deal_events(event_type, created_at, notes, kill_reasons(name))')
    .eq('is_archived', true)
    .order('archived_at', { ascending: false })

  const archivedDeals = ((dealsData ?? []) as any[]).map((deal: any) => ({
    ...deal,
    killEvent: deal.deal_events?.find((event: any) => event.event_type === 'killed'),
  }))

  const uniqueMarkets = [...new Set(archivedDeals.map((deal: any) => deal.market).filter(Boolean))].sort()
  const marketCounts: Record<string, number> = {}
  const killCounts: Record<string, number> = {}

  archivedDeals.forEach((deal: any) => {
    if (deal.market) marketCounts[deal.market] = (marketCounts[deal.market] ?? 0) + 1
    const reason = deal.killEvent?.kill_reasons?.name
    if (reason) killCounts[reason] = (killCounts[reason] ?? 0) + 1
  })

  const filtered = archivedDeals
    .filter((deal: any) => !searchParams.market || deal.market === searchParams.market)
    .filter((deal: any) => !searchParams.deal_type || deal.deal_type === searchParams.deal_type)
    .filter((deal: any) => !searchParams.q || deal.title.toLowerCase().includes(searchParams.q.toLowerCase()))

  const topKillReason = Object.entries(killCounts).sort((a, b) => b[1] - a[1])[0]
  const topMarket = Object.entries(marketCounts).sort((a, b) => b[1] - a[1])[0]
  const withNotes = archivedDeals.filter((deal: any) => deal.killEvent?.notes).length
  const totalKilled = archivedDeals.length

  return (
    <div className="app-page app-graveyard-page">
      <div className="app-page-header">
        <p className="app-eyebrow">Deal memory</p>
        <h1 className="app-title">Graveyard</h1>
        <p className="app-subtitle">{filtered.length} killed deals preserved for future recall.</p>
      </div>

      <div className="app-graveyard-kpis">
        <div className="app-graveyard-kpi">
          <p>{totalKilled}</p>
          <span>Killed deals</span>
        </div>
        <div className="app-graveyard-kpi">
          <p>{topKillReason?.[1] ?? 0}</p>
          <span>{topKillReason?.[0] ?? 'Top kill reason'}</span>
        </div>
        <div className="app-graveyard-kpi">
          <p>{topMarket?.[1] ?? 0}</p>
          <span>{topMarket?.[0] ?? 'Most common market'}</span>
        </div>
        <div className="app-graveyard-kpi">
          <p>{withNotes}</p>
          <span>With decision notes</span>
        </div>
      </div>

      {Object.keys(killCounts).length > 0 && (
        <div className="app-graveyard-reason-row">
          {Object.entries(killCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
            <div key={name}>
              <span>{name}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      )}

      <section className="app-graveyard-panel">
        <div className="app-graveyard-panel-header">
          <div>
            <p className="app-dashboard-kicker">Archive</p>
            <h2>Killed deal memory</h2>
          </div>
          <span>{filtered.length} shown</span>
        </div>

        <form className="app-graveyard-toolbar">
          <input name="q" defaultValue={searchParams.q} placeholder="Search deals..." className="input-base" />
          <select name="market" defaultValue={searchParams.market} className="input-base">
            <option value="">All markets</option>
            {uniqueMarkets.map(market => <option key={market} value={market}>{market}</option>)}
          </select>
          <button type="submit" className="btn-secondary">Filter</button>
          {(searchParams.q || searchParams.market) && (
            <a href="/graveyard" className="btn-ghost">Clear</a>
          )}
        </form>

        {filtered.length === 0 ? (
          <div className="app-dashboard-empty">
            <p>No killed deals found.</p>
            <span>Try clearing filters or killing a deal from the pipeline to preserve the decision.</span>
          </div>
        ) : (
          <div className="app-graveyard-table">
            <div className="app-graveyard-row app-graveyard-head">
              <span>Deal</span>
              <span>Market</span>
              <span>Kill reason</span>
              <span>Killed</span>
              <span>Action</span>
            </div>
            {filtered.map((deal: any) => (
              <div key={deal.id} className="app-graveyard-row">
                <div>
                  <Link href={`/deals/${deal.id}`}>{deal.title}</Link>
                  {deal.killEvent?.notes ? (
                    <p>{deal.killEvent.notes}</p>
                  ) : (
                    <p className="muted">No decision note captured.</p>
                  )}
                </div>
                <span>{deal.market ?? '—'}</span>
                <span className="app-graveyard-reason">{deal.killEvent?.kill_reasons?.name ?? '—'}</span>
                <span>{formatDate(deal.archived_at)}</span>
                <form action={reactivateDeal.bind(null, deal.id)}>
                  <button type="submit" className="btn-secondary">Reactivate</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
