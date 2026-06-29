import { createClient } from '@/lib/supabase/server'
import KanbanBoard from '@/components/pipeline/KanbanBoard'
import { calculateOverallScore } from '@/lib/workflow.mjs'

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: stages },
    { data: killReasons },
    { data: rawDeals },
    { data: checklistItems },
    { data: dealProgress },
  ] = await Promise.all([
    supabase.from('deal_stages').select('*').order('position'),
    supabase.from('kill_reasons').select('*').order('position'),
    supabase
      .from('deals')
      .select(`
        id, title, market, deal_type, stage_id, firm_id, is_archived,
        asking_price, unit_count, created_at,
        owner:profiles!owner_user_id(full_name),
        latest_stage_event:deal_events(created_at),
        deal_notes(section, content),
        deal_scores(score)
      `)
      .eq('is_archived', false)
      .order('created_at', { ascending: false }),
    supabase.from('stage_checklist_items').select('id, stage_id, name, position').order('position'),
    supabase.from('deal_checklist_progress').select('deal_id, checklist_item_id'),
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
    const scores = (deal.deal_scores ?? []).map((r: any) => Number(r.score)).filter(Boolean)
    const score = calculateOverallScore(scores)

    return {
      ...deal,
      latest_stage_event_at: latest,
      latest_stage_event: undefined,
      deal_notes: undefined,
      deal_scores: undefined,
      hasNotes,
      score,
    }
  })

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-xl font-semibold text-gray-900">Deal Pipeline</h1>
        <p className="text-sm text-gray-500 mt-1">{deals.length} active deals</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          initialStages={stages ?? []}
          initialDeals={deals ?? []}
          killReasons={killReasons ?? []}
          currentUserId={user?.id ?? ''}
          checklistItems={checklistItems ?? []}
          dealProgress={dealProgress ?? []}
        />
      </div>
    </div>
  )
}
