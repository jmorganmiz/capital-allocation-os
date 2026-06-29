import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { reactivateDeal } from '@/lib/actions/deals'

interface SearchParams {
  q?: string
  market?: string
  deal_type?: string
}

const th = {
  fontSize: '11px' as const,
  fontWeight: 600,
  color: 'var(--lead)',
  letterSpacing: '0.07em',
  textTransform: 'uppercase' as const,
  padding: '10px 20px',
  textAlign: 'left' as const,
}

export default async function GraveyardPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()

  let query = supabase
    .from('deals')
    .select(`id, title, market, deal_type, archived_at, deal_events(event_type, created_at, notes, kill_reasons(name))`)
    .eq('is_archived', true)
    .order('archived_at', { ascending: false })

  if (searchParams.market)    query = query.eq('market', searchParams.market)
  if (searchParams.deal_type) query = query.eq('deal_type', searchParams.deal_type)

  const { data: dealsData } = await query

  const filtered = ((dealsData ?? []) as any[])
    .map((d: any) => ({ ...d, killEvent: d.deal_events?.find((e: any) => e.event_type === 'killed') }))
    .filter(d => !searchParams.q || d.title.toLowerCase().includes(searchParams.q.toLowerCase()))

  const { data: marketsData } = await supabase
    .from('deals').select('market').eq('is_archived', true).not('market', 'is', null)
  const uniqueMarkets = [...new Set(((marketsData ?? []) as any[]).map((d: any) => d.market).filter(Boolean))]

  const { data: killStats } = await supabase
    .from('deal_events').select('kill_reasons(name)').eq('event_type', 'killed').not('kill_reason_id', 'is', null)

  const killCounts: Record<string, number> = {}
  ;(killStats ?? []).forEach((e: any) => {
    const name = e.kill_reasons?.name
    if (name) killCounts[name] = (killCounts[name] ?? 0) + 1
  })

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <div className="mb-8">
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--starlight)' }}>Graveyard</h1>
        <p style={{ fontSize: '13px', color: 'var(--lead)', marginTop: '3px' }}>{filtered.length} killed deals</p>
      </div>

      {/* Kill reason summary pills */}
      {Object.keys(killCounts).length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {Object.entries(killCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
            <div key={name} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{
              background: 'var(--midnight-slate)',
              border: '1px solid rgba(112,112,125,0.2)',
              boxShadow: 'var(--card-shadow)',
            }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--silver)' }}>{name}</span>
              <span style={{
                fontSize: '10px', fontWeight: 700,
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                color: '#f87171', borderRadius: '999px', padding: '1px 7px',
              }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <form className="flex gap-3 flex-wrap">
          <input name="q" defaultValue={searchParams.q} placeholder="Search deals…" className="input-base w-48" />
          <select name="market" defaultValue={searchParams.market} className="input-base w-40">
            <option value="">All Markets</option>
            {uniqueMarkets.map(m => <option key={m} value={m!}>{m}</option>)}
          </select>
          <button type="submit" className="btn-secondary">Filter</button>
          {(searchParams.q || searchParams.market) && (
            <a href="/graveyard" className="btn-ghost">Clear</a>
          )}
        </form>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg py-16 text-center" style={{ border: '1px dashed rgba(112,112,125,0.25)' }}>
          <p style={{ fontSize: '13px', color: 'var(--lead)' }}>No killed deals found.</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(112,112,125,0.2)', boxShadow: 'var(--card-shadow)' }}>
          <table className="w-full min-w-[640px] text-sm">
            <thead style={{ background: 'var(--graphite)', borderBottom: '1px solid rgba(112,112,125,0.15)' }}>
              <tr>
                <th style={th}>Deal</th>
                <th style={th}>Market</th>
                <th style={th}>Kill Reason</th>
                <th style={th}>Killed</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((deal, i) => (
                <tr
                  key={deal.id}
                  style={{ borderTop: i > 0 ? '1px solid rgba(112,112,125,0.1)' : 'none', background: 'var(--midnight-slate)' }}
                >
                  <td style={{ padding: '14px 20px' }}>
                    <Link href={`/deals/${deal.id}`} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--mercury-blue)' }}>
                      {deal.title}
                    </Link>
                    {deal.killEvent?.notes && (
                      <p style={{ fontSize: '11px', color: 'var(--lead)', marginTop: '3px', fontStyle: 'italic' }}>"{deal.killEvent.notes}"</p>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--silver)' }}>{deal.market ?? '—'}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 600,
                      background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                      color: '#f87171', borderRadius: '999px', padding: '3px 8px',
                    }}>
                      {(deal.killEvent as any)?.kill_reasons?.name ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '12px', color: 'var(--lead)' }}>
                    {deal.archived_at
                      ? new Date(deal.archived_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <form action={reactivateDeal.bind(null, deal.id)}>
                      <button type="submit" className="btn-secondary" style={{ fontSize: '12px', padding: '7px 12px' }}>
                        Reactivate
                      </button>
                    </form>
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
