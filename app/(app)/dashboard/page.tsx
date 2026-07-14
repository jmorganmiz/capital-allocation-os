import { createClient } from '@/lib/supabase/server'
import AttentionQueue from '@/components/dashboard/AttentionQueue'
import { classifyAttention } from '@/lib/workflow.mjs'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user?.id ?? '')
    .single()

  const firmId = profile?.firm_id ?? ''

  const [
    { data: stages },
    { data: activeDeals },
    { data: firmDeals },
    { data: usageEvents },
  ] = await Promise.all([
    supabase.from('deal_stages').select('id, name, position').eq('firm_id', firmId).order('position'),
    supabase.from('deals').select('id, title, stage_id, intake_type, created_at, updated_at, deal_scores(score)').eq('firm_id', firmId).eq('is_archived', false),
    supabase.from('deals').select('id').eq('firm_id', firmId),
    supabase.from('usage_events').select('event_type, quantity, metadata, created_at').eq('firm_id', firmId).eq('event_type', 'deal_created').order('created_at', { ascending: false }).limit(250),
  ])

  const firmDealIds = (firmDeals ?? []).map(d => d.id)
  const { data: killEvents } = firmDealIds.length > 0
    ? await supabase.from('deal_events').select('kill_reasons(name)').eq('event_type', 'killed').not('kill_reason_id', 'is', null).in('deal_id', firmDealIds)
    : { data: [] }

  const activeStages = (stages ?? []).filter(s => s.name !== 'Killed')
  const dealsByStage = activeStages.map(stage => ({
    name: stage.name,
    count: (activeDeals ?? []).filter(d => d.stage_id === stage.id).length,
  }))
  const totalActive = (activeDeals ?? []).length
  const firstStageId = activeStages[0]?.id
  const { needsReview, staleDeals } = classifyAttention(activeDeals ?? [], firstStageId)

  const killCounts: Record<string, number> = {}
  ;(killEvents ?? []).forEach((e: any) => {
    const name = e.kill_reasons?.name
    if (name) killCounts[name] = (killCounts[name] ?? 0) + 1
  })
  const killBreakdown = Object.entries(killCounts).sort((a, b) => b[1] - a[1])
  const totalKilled = killBreakdown.reduce((sum, [, n]) => sum + n, 0)
  // Server-rendered product health window; recalculated once per request.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const daysAgo = (days: number) => now - (days * 24 * 60 * 60 * 1000)
  const usage = usageEvents ?? []
  const quantity = (event: { quantity: number | null }) => Number(event.quantity ?? 0)
  const parsedThisWeek = usage
    .filter(event => new Date(event.created_at).getTime() >= daysAgo(7))
    .reduce((sum, event) => sum + quantity(event), 0)
  const parsedLast14Days = usage
    .filter(event => new Date(event.created_at).getTime() >= daysAgo(14))
    .reduce((sum, event) => sum + quantity(event), 0)
  const latestParsedAt = usage[0]?.created_at ?? null
  const sourceCounts = usage
    .filter(event => new Date(event.created_at).getTime() >= daysAgo(30))
    .reduce<Record<string, number>>((acc, event) => {
      const metadata = event.metadata as { source?: string } | null
      const source = metadata?.source ?? 'unknown'
      acc[source] = (acc[source] ?? 0) + quantity(event)
      return acc
    }, {})
  const sourceBreakdown = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])
  const isAtRisk = firmDealIds.length > 0 && parsedLast14Days === 0

  const kpis = [
    { label: 'Total active', value: totalActive, tone: 'blue' },
    { label: 'New to review', value: needsReview.length, tone: needsReview.length > 0 ? 'blue' : 'neutral' },
    { label: 'Stale deals', value: staleDeals.length, tone: staleDeals.length > 0 ? 'amber' : 'neutral' },
    { label: 'Killed memory', value: totalKilled, tone: 'neutral' },
    { label: 'Parsed this week', value: parsedThisWeek, tone: parsedThisWeek > 0 ? 'blue' : (isAtRisk ? 'amber' : 'neutral') },
  ]

  return (
    <div className="app-page app-dashboard-page">
      <div className="app-page-header">
        <p className="app-eyebrow">Dashboard</p>
        <h1 className="app-title">Firm overview</h1>
        <p className="app-subtitle">{totalActive} active deals across {activeStages.length} stages</p>
      </div>

      <div className="app-dashboard-kpis">
        {kpis.map(kpi => (
          <div key={kpi.label} className="app-dashboard-kpi" data-tone={kpi.tone}>
            <p>{kpi.value}</p>
            <span>{kpi.label}</span>
          </div>
        ))}
      </div>

      <div className="app-dashboard-grid">
        <AttentionQueue needsReview={needsReview} staleDeals={staleDeals} />

        <section className="app-dashboard-panel app-dashboard-stage-panel">
          <div className="app-dashboard-panel-header">
            <div>
              <p className="app-dashboard-kicker">Deals by stage</p>
              <h2>Workflow shape</h2>
            </div>
            <span>{totalActive} active</span>
          </div>
          <div className="app-dashboard-stage-grid">
            {dealsByStage.map(({ name, count }) => (
              <div key={name} className="app-dashboard-stage-card">
                <p>{count}</p>
                <span>{name}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="app-dashboard-panel app-dashboard-pulse-panel" data-risk={isAtRisk ? 'true' : 'false'}>
        <div className="app-dashboard-panel-header">
          <div>
            <p className="app-dashboard-kicker">Activation pulse</p>
            <h2>Deals parsed per firm per week</h2>
          </div>
          <span>{isAtRisk ? 'At risk' : 'Healthy'}</span>
        </div>
        <div className="app-dashboard-pulse-grid">
          <div>
            <p>{parsedThisWeek}</p>
            <span>Deals created in the last 7 days</span>
          </div>
          <div>
            <p>{parsedLast14Days}</p>
            <span>Deals created in the last 14 days</span>
          </div>
          <div>
            <p>{latestParsedAt ? new Date(latestParsedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '?'}</p>
            <span>Most recent pipeline addition</span>
          </div>
        </div>
        {sourceBreakdown.length > 0 ? (
          <div className="app-dashboard-source-list">
            {sourceBreakdown.map(([source, count]) => (
              <div key={source}>
                <span>{source.replace(/_/g, ' ')}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="app-dashboard-pulse-note">
            No deal creation events recorded yet. The first email, upload, manual add, CSV import, or Property Finder promotion will start this pulse.
          </p>
        )}
      </section>

      <section className="app-dashboard-panel app-dashboard-memory-panel">
        <div className="app-dashboard-panel-header">
          <div>
            <p className="app-dashboard-kicker">Deal memory</p>
            <h2>Kill reason breakdown</h2>
          </div>
          {totalKilled > 0 && <span>{totalKilled} total</span>}
        </div>

        {killBreakdown.length === 0 ? (
          <div className="app-dashboard-empty">
            <p>No killed deals yet.</p>
            <span>Kill reasons will appear here once deals are preserved in the graveyard.</span>
          </div>
        ) : (
          <div className="app-dashboard-kill-list">
            {killBreakdown.map(([name, count], i) => {
              const pct = Math.round((count / totalKilled) * 100)
              return (
                <div key={name} className="app-dashboard-kill-row" style={{ borderTop: i > 0 ? '1px solid rgba(112,112,125,0.1)' : 'none' }}>
                  <div>
                    <p>{name}</p>
                    <span>{count} deal{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="app-dashboard-kill-bar">
                    <div style={{ width: `${pct}%` }} />
                  </div>
                  <strong>{pct}%</strong>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
