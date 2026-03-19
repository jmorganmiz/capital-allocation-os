import { DEMO_DEALS, DEMO_STAGES, DEMO_KILL_BREAKDOWN, DEMO_TOTAL_KILLED } from '@/lib/demo-data'

function DemoLabel() {
  return (
    <span className="flex items-center gap-1 text-xs text-gray-400 font-normal normal-case tracking-normal">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      Demo data
    </span>
  )
}

export default function DemoDashboardPage() {
  const activeStages = DEMO_STAGES.filter(s => !s.is_terminal)
  const activeDeals = DEMO_DEALS.filter(d => !d.is_archived)
  const totalActive = activeDeals.length

  const dealsByStage = activeStages.map(stage => ({
    name: stage.name,
    count: activeDeals.filter(d => d.stage_id === stage.id).length,
  }))

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {totalActive} active deals across {activeStages.length} stages
        </p>
      </div>

      {/* Deals by Stage */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Deals by Stage</h2>
          <DemoLabel />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {dealsByStage.map(({ name, count }) => (
            <div key={name} className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500 mt-1 truncate">{name}</p>
            </div>
          ))}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-2xl font-bold text-red-500">{DEMO_TOTAL_KILLED}</p>
            <p className="text-sm text-gray-500 mt-1">Killed</p>
          </div>
          <div className="bg-gray-900 text-white rounded-lg p-4">
            <p className="text-2xl font-bold">{totalActive}</p>
            <p className="text-sm text-gray-400 mt-1">Total Active</p>
          </div>
        </div>
      </section>

      {/* Kill Reason Breakdown */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Kill Reason Breakdown
            <span className="ml-2 font-normal text-gray-400 normal-case">({DEMO_TOTAL_KILLED} total)</span>
          </h2>
          <DemoLabel />
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {DEMO_KILL_BREAKDOWN.map(({ name, count }, i) => {
            const pct = Math.round((count / DEMO_TOTAL_KILLED) * 100)
            return (
              <div key={name} className={`px-4 py-3 flex items-center gap-4 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-800">{name}</span>
                    <span className="text-sm text-gray-500 ml-4 flex-shrink-0">{count} deal{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-red-400 h-1.5 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-400 w-10 text-right flex-shrink-0">{pct}%</span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
