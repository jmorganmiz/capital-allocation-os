import { createClient } from '@/lib/supabase/server'

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
    { data: killEvents },
  ] = await Promise.all([
    supabase
      .from('deal_stages')
      .select('id, name, position')
      .eq('firm_id', firmId)
      .order('position'),
    supabase
      .from('deals')
      .select('id, stage_id')
      .eq('firm_id', firmId)
      .eq('is_archived', false),
    supabase
      .from('deal_events')
      .select('kill_reasons(name)')
      .eq('event_type', 'killed')
      .not('kill_reason_id', 'is', null),
  ])

  // Deals by stage (exclude Killed stage)
  const activeStages = (stages ?? []).filter(s => s.name !== 'Killed')
  const dealsByStage = activeStages.map(stage => ({
    name: stage.name,
    count: (activeDeals ?? []).filter(d => d.stage_id === stage.id).length,
  }))
  const totalActive = (activeDeals ?? []).length

  // Kill reason breakdown
  const killCounts: Record<string, number> = {}
  ;(killEvents ?? []).forEach((e: any) => {
    const name = e.kill_reasons?.name
    if (name) killCounts[name] = (killCounts[name] ?? 0) + 1
  })
  const killBreakdown = Object.entries(killCounts).sort((a, b) => b[1] - a[1])
  const totalKilled = killBreakdown.reduce((sum, [, n]) => sum + n, 0)

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{totalActive} active deals across {activeStages.length} stages</p>
      </div>

      {/* Deals by Stage */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Deals by Stage</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {dealsByStage.map(({ name, count }) => (
            <div key={name} className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500 mt-1 truncate">{name}</p>
            </div>
          ))}
          <div className="bg-gray-900 text-white rounded-lg p-4">
            <p className="text-2xl font-bold">{totalActive}</p>
            <p className="text-sm text-gray-400 mt-1">Total Active</p>
          </div>
        </div>
      </section>

      {/* Kill Reason Breakdown */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Kill Reason Breakdown
          {totalKilled > 0 && <span className="ml-2 font-normal text-gray-400 normal-case">({totalKilled} total)</span>}
        </h2>

        {killBreakdown.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-lg p-10 text-center text-sm text-gray-400">
            No killed deals yet. Kill reasons will appear here once deals are killed.
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {killBreakdown.map(([name, count], i) => {
              const pct = Math.round((count / totalKilled) * 100)
              return (
                <div key={name} className={`px-4 py-3 flex items-center gap-4 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-800">{name}</span>
                      <span className="text-sm text-gray-500 ml-4 flex-shrink-0">{count} deal{count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-red-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-10 text-right flex-shrink-0">{pct}%</span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
