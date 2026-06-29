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
  ] = await Promise.all([
    supabase.from('deal_stages').select('id, name, position').eq('firm_id', firmId).order('position'),
    supabase.from('deals').select('id, title, stage_id, intake_type, created_at, updated_at, deal_scores(score)').eq('firm_id', firmId).eq('is_archived', false),
    supabase.from('deals').select('id').eq('firm_id', firmId),
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

  const th = { fontSize: '11px', fontWeight: 600, color: 'var(--lead)', letterSpacing: '0.07em', textTransform: 'uppercase' as const }

  return (
    <div className="app-page">
      <div className="app-page-header">
        <p className="app-eyebrow">Dashboard</p>
        <h1 className="app-title">Firm overview</h1>
        <p className="app-subtitle">{totalActive} active deals across {activeStages.length} stages</p>
      </div>

      <AttentionQueue needsReview={needsReview} staleDeals={staleDeals} />

      {/* Deals by Stage */}
      <section className="mb-10">
        <h2 style={{ ...th, display: 'block', marginBottom: '16px' }}>Deals by Stage</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {dealsByStage.map(({ name, count }) => (
            <div key={name} className="rounded-lg p-4" style={{
              background: 'var(--midnight-slate)',
              border: '1px solid rgba(112,112,125,0.2)',
              boxShadow: 'var(--card-shadow)',
            }}>
              <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--starlight)', lineHeight: 1 }}>{count}</p>
              <p style={{ fontSize: '12px', color: 'var(--lead)', marginTop: '6px' }} className="truncate">{name}</p>
            </div>
          ))}
          <div className="rounded-lg p-4" style={{
            background: 'rgba(82,102,235,0.12)',
            border: '1px solid rgba(82,102,235,0.25)',
            boxShadow: 'var(--card-shadow)',
          }}>
            <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--mercury-blue)', lineHeight: 1 }}>{totalActive}</p>
            <p style={{ fontSize: '12px', color: 'var(--lead)', marginTop: '6px' }}>Total Active</p>
          </div>
        </div>
      </section>

      {/* Kill Reason Breakdown */}
      <section>
        <h2 style={{ ...th, display: 'block', marginBottom: '16px' }}>
          Kill Reason Breakdown
          {totalKilled > 0 && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--lead)', marginLeft: '8px', fontSize: '12px' }}>({totalKilled} total)</span>}
        </h2>

        {killBreakdown.length === 0 ? (
          <div className="rounded-lg p-12 text-center" style={{ border: '1px dashed rgba(112,112,125,0.25)' }}>
            <p style={{ fontSize: '13px', color: 'var(--lead)' }}>No killed deals yet. Kill reasons will appear here once deals are killed.</p>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(112,112,125,0.2)', boxShadow: 'var(--card-shadow)' }}>
            {killBreakdown.map(([name, count], i) => {
              const pct = Math.round((count / totalKilled) * 100)
              return (
                <div key={name} className="px-5 py-4 flex items-center gap-4" style={{
                  borderTop: i > 0 ? '1px solid rgba(112,112,125,0.1)' : 'none',
                  background: 'var(--midnight-slate)',
                }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--starlight)' }}>{name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--lead)', marginLeft: '16px', flexShrink: 0 }}>{count} deal{count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: '3px', background: 'rgba(112,112,125,0.2)' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--mercury-blue)', borderRadius: '999px', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--lead)', width: '36px', textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
