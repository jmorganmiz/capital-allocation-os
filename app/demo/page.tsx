import { Suspense } from 'react'
import DemoKanbanBoard from '@/components/demo/DemoKanbanBoard'
import { DEMO_DEALS } from '@/lib/demo-data'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function DemoPipelinePage({ searchParams }: Props) {
  const { q } = await searchParams
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3">
        <h1 className="text-xl font-semibold text-gray-900">Deal Pipeline</h1>
        <p className="text-sm text-gray-500 mt-0.5">{DEMO_DEALS.length} active deals</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={null}>
          <DemoKanbanBoard initialDeals={DEMO_DEALS} searchQuery={q ?? ''} />
        </Suspense>
      </div>
    </div>
  )
}
