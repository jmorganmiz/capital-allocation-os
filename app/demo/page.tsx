import DemoKanbanBoard from '@/components/demo/DemoKanbanBoard'
import { DEMO_DEALS } from '@/lib/demo-data'

export default function DemoPipelinePage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3">
        <h1 className="text-xl font-semibold text-gray-900">Deal Pipeline</h1>
        <p className="text-sm text-gray-500 mt-0.5">{DEMO_DEALS.length} active deals</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <DemoKanbanBoard initialDeals={DEMO_DEALS} />
      </div>
    </div>
  )
}
