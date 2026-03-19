import { formatDistanceToNow } from 'date-fns'
import { DEMO_KILLED_DEALS } from '@/lib/demo-data'

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

export default function DemoGraveyardPage() {
  // Derive kill reason counts from killed deals
  const killCounts: Record<string, number> = {}
  DEMO_KILLED_DEALS.forEach(d => {
    killCounts[d.kill_reason] = (killCounts[d.kill_reason] ?? 0) + 1
  })
  const killStats = Object.entries(killCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Graveyard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{DEMO_KILLED_DEALS.length} killed deals</p>
      </div>

      {/* Kill reason stat pills */}
      <div className="flex gap-3 flex-wrap mb-6">
        {killStats.map(([name, count]) => (
          <div key={name} className="bg-white border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800">{name}</span>
            <span className="text-xs bg-red-50 text-red-600 rounded-full px-2 py-0.5 font-medium">{count}</span>
          </div>
        ))}
        <DemoLabel />
      </div>

      {/* Killed deals table */}
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
            {DEMO_KILLED_DEALS.map(deal => (
              <tr key={deal.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{deal.title}</span>
                  {deal.deal_type && (
                    <p className="text-xs text-gray-400 mt-0.5">{deal.deal_type}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{deal.market}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">
                    {deal.kill_reason}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {formatDistanceToNow(new Date(deal.archived_at), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
