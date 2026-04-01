import { createClient } from '@/lib/supabase/server'
import KanbanBoard from '@/components/pipeline/KanbanBoard'

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: stages },
    { data: killReasons },
    { data: rawDeals },
  ] = await Promise.all([
    supabase.from('deal_stages').select('*').order('position'),
    supabase.from('kill_reasons').select('*').order('position'),
    supabase
      .from('deals')
      .select(`
        *,
        owner:profiles!owner_user_id(full_name),
        latest_stage_event:deal_events(created_at),
        deal_notes(section, content)
      `)
      .eq('is_archived', false)
      .order('created_at', { ascending: false }),
  ])

  // Get latest stage_changed event per deal for time-in-stage
  const deals = (rawDeals ?? []).map(deal => {
    const stageEvents = (deal.latest_stage_event ?? [])
    const latest = stageEvents.length > 0
      ? stageEvents.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0].created_at
      : deal.created_at

    const hasNotes = (deal.deal_notes ?? []).some((n: any) => n.content?.trim().length > 0)

    return {
      ...deal,
      latest_stage_event_at: latest,
      latest_stage_event: undefined,
      deal_notes: undefined,
      hasNotes,
    }
  })

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3">
        <h1 className="text-xl font-semibold text-gray-900">Deal Pipeline</h1>
        <p className="text-sm text-gray-500 mt-0.5">{deals.length} active deals</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          initialStages={stages ?? []}
          initialDeals={deals ?? []}
          killReasons={killReasons ?? []}
          currentUserId={user?.id ?? ''}
        />
      </div>
    </div>
  )
}
