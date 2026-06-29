import { createClient } from '@/lib/supabase/server'
import KanbanBoard from '@/components/pipeline/KanbanBoard'
import { calculateOverallScore } from '@/lib/workflow.mjs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    <div className="app-page-wide app-pipeline-page">
      <div className="app-page-header app-pipeline-header">
        <div>
          <p className="app-eyebrow">Pipeline</p>
          <h1 className="app-title">Deal Pipeline</h1>
          <p className="app-subtitle">{deals.length} active deal{deals.length === 1 ? '' : 's'} across your firm workflow</p>
        </div>
      </div>

      <KanbanBoard
        initialStages={stages ?? []}
        initialDeals={(deals ?? []) as any}
        killReasons={killReasons ?? []}
        currentUserId={user?.id ?? ''}
        checklistItems={checklistItems ?? []}
        dealProgress={dealProgress ?? []}
      />
    </div>
  )
}
