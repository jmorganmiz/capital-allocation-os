import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface SearchParams {
  q?: string
  market?: string
  deal_type?: string
}

export default async function GraveyardPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()

  let query = supabase
    .from('deals')
    .select(`
      id, title, market, deal_type, archived_at,
      deal_events(event_type, created_at, notes, kill_reasons(name))
    `)
    .eq('is_archived', true)
    .order('archived_at', { ascending: false })

  if (searchParams.market)    query = query.eq('market', searchParams.market)
  if (searchParams.deal_type) query = query.eq('deal_type', searchParams.deal_type)

  const { data: dealsData } = await query

  const filtered = ((dealsData ?? []) as any[])
    .map((d: any) => ({
      ...d,
      killEvent: d.deal_events?.find((e: any) => e.event_type === 'killed'),
    }))
    .filter(d =>
      !searchParams.q ||
      d.title.toLowerCase().includes(searchParams.q.toLowerCase())
    )

  const { data: marketsData } = await supabase
    .from('deals')
    .select('market')
    .eq('is_archived', true)
    .not('market', 'is', null)

  const uniqueMarkets = [...new Set(((marketsData ?? []) as any[]).map((d: any) => d.market).filter(Boolean))]

  const { data: killStats } = await supabase
    .from('deal_events')
    .select('kill_reasons(name)')
    .eq('event_type', 'killed')
    .not('kill_reason_id', 'is', null)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Graveyard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{filtered.length} killed deals</p>
      </div>

      <div className="flex gap-3 mb-6">
        <form className="flex gap-3 flex-wrap">
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search deals…"
            className="input-base w-48"
          />
          <select name="market" defaultValue={searchParams.market} className="input-base w-40">
            <option value="">All Markets</option>
            {uniqueMarkets.map(m => (
              <option key={m} value={m!}>{m}</option>
            ))}
          </select>
          <button type="submit" className="btn-secondary">Filter</button>
          {(searchParams.q || searchParams.market) && (
            <a href="/graveyard" className="btn-ghost">Clear</a>
          )}
        </form>
      </div>

      {killStats && killStats.length > 0 && (() => {
        const counts: Record<string, number> = {}
        killStats.forEach((e: any) => {
          const name = e.kill_reasons?.name
          if (name) counts[name] = (counts[name] ?? 0) + 1
        })
        return (
          <div className="flex gap-3 flex-wrap mb-6">
            {Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (
                <div key={name} className="bg-white border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{name}</span>
                  <span className="text-xs bg-red-50 text-red-600 rounded-full px-2 py-0.5 font-medium">{count}</span>
                </div>
              ))}
          </div>
        )
      })()}

      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16 text-sm">
          No killed deals found.
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Deal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Market</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kill Reason</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Killed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(deal => (
                <tr key={deal.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/deals/${deal.id}`} className="text-blue-700 hover:underline font-medium">
                      {deal.title}
                    </Link>
                    {deal.killEvent?.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 italic">"{deal.killEvent.notes}"</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{deal.market ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">
                      {(deal.killEvent as any)?.kill_reasons?.name ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {deal.archived_at
                      ? new Date(deal.archived_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
