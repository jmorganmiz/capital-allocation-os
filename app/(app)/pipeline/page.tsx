import { createClient } from '@/lib/supabase/server'
import KanbanBoard from '@/components/pipeline/KanbanBoard'

export default async function PipelinePage() {
  const supabase = await createClient()

  const [{ data: stages }, { data: deals }, { data: killReasons }] = await Promise.all([
    supabase.from('deal_stages').select('*').order('position'),
    supabase.from('deals').select('*').eq('is_archived', false).order('created_at', { ascending: false }),
    supabase.from('kill_reasons').select('*').order('position'),
  ])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Deal Pipeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">{deals?.length ?? 0} active deals</p>
        </div>
      </div>
      <KanbanBoard
        stages={stages ?? []}
        initialDeals={deals ?? []}
        killReasons={killReasons ?? []}
      />
    </div>
  )
}
