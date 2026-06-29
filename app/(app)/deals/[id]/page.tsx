import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DealHeader from '@/components/deal/DealHeader'
import DealTabs from '@/components/deal/DealTabs'
import StageChecklist from '@/components/deal/StageChecklist'
import NotesSection from '@/components/deal/NotesSection'
import FilesSection from '@/components/deal/FilesSection'
import DecisionLog from '@/components/deal/DecisionLog'
import FinancialSnapshot from '@/components/deal/FinancialSnapshot'
import DealInfo from '@/components/deal/DealInfo'
import ContactsSection from '@/components/deal/ContactsSection'
import ScoringSection from '@/components/deal/ScoringSection'
import { getScoringCriteria, getDealScores } from '@/lib/actions/scoring'
import SimilarDeals from '@/components/deal/SimilarDeals'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DealPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: deal },
    { data: stages },
    { data: killReasons },
    { data: notes },
    { data: files },
    { data: events },
    { data: snapshots },
    { data: dealContacts },
  ] = await Promise.all([
    supabase.from('deals').select('*').eq('id', id).single(),
    supabase.from('deal_stages').select('*').order('position'),
    supabase.from('kill_reasons').select('*').order('position'),
    supabase.from('deal_notes').select('*').eq('deal_id', id),
    supabase.from('deal_files').select('*').eq('deal_id', id).order('created_at', { ascending: false }),
    supabase
      .from('deal_events')
      .select(`*, profiles(full_name), kill_reasons(name),
               from_stage:deal_stages!from_stage_id(name),
               to_stage:deal_stages!to_stage_id(name)`)
      .eq('deal_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('deal_financial_snapshots')
      .select('*')
      .eq('deal_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('deal_contacts')
      .select('*, contacts(*)')
      .eq('deal_id', id),
  ])

  // Checklist for the current stage (fetched after deal is known)
  const dealStageId = deal?.stage_id ?? null
  const [{ data: checklistItems }, { data: checklistProgress }] = await Promise.all([
    dealStageId
      ? supabase.from('stage_checklist_items').select('*').eq('stage_id', dealStageId).order('position')
      : Promise.resolve({ data: [] }),
    supabase.from('deal_checklist_progress').select('checklist_item_id').eq('deal_id', id),
  ])

  const [scoringCriteriaResult, dealScoresResult] = await Promise.all([
    getScoringCriteria(),
    getDealScores(id),
  ])

  if (!deal) notFound()

  // Similar deals: same firm, same deal_type or same market, excluding self
  let similarQuery = supabase
    .from('deals')
    .select('id, title, market, deal_type, asking_price, is_archived, stage_id, deal_scores(score), deal_stages(name)')
    .eq('firm_id', deal.firm_id)
    .neq('id', id)
    .limit(20)

  const orParts: string[] = []
  if (deal.deal_type) orParts.push(`deal_type.eq.${deal.deal_type}`)
  if (deal.market) orParts.push(`market.eq.${deal.market}`)
  if (orParts.length > 0) similarQuery = similarQuery.or(orParts.join(','))

  const { data: rawSimilar } = orParts.length > 0 ? await similarQuery : { data: [] }

  const similarDeals = ((rawSimilar ?? []) as any[])
    .map(d => {
      const scores = (d.deal_scores ?? []).map((s: any) => Number(s.score)).filter(Boolean)
      const avg = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null
      const score = avg !== null ? Math.round(((avg - 1) / 4) * 100) : null
      const typeMatch = deal.deal_type && d.deal_type === deal.deal_type
      const marketMatch = deal.market && d.market === deal.market
      const priceMatch = deal.asking_price && d.asking_price
        ? Math.abs(d.asking_price - deal.asking_price) / deal.asking_price < 0.5
        : false
      return {
        id: d.id,
        title: d.title,
        market: d.market,
        deal_type: d.deal_type,
        asking_price: d.asking_price,
        is_archived: d.is_archived,
        stage_name: d.deal_stages?.name ?? null,
        score,
        match_type: typeMatch && marketMatch ? 'both' : typeMatch ? 'type' : 'market',
        asking_price_match: priceMatch,
      }
    })
    .sort((a, b) => {
      const rank = (x: typeof a) => (x.match_type === 'both' ? 2 : 1) + (x.asking_price_match ? 1 : 0)
      return rank(b) - rank(a)
    })
    .slice(0, 6)

  // Get firm users for owner dropdown
  const { data: firmUsers } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('firm_id', deal.firm_id)

  const currentStage = stages?.find(s => s.id === deal.stage_id)
  const getNote = (section: string) => notes?.find(n => n.section === section)?.content ?? ''

  const hasAnyNotes = (notes ?? []).some(n => n.content?.trim().length > 0)

  return (
    <div className="mx-auto max-w-[1100px] px-12 py-10">
      <DealHeader
        deal={deal}
        stages={stages ?? []}
        killReasons={killReasons ?? []}
        currentStage={currentStage}
        firmUsers={firmUsers ?? []}
      />

      <DealTabs />

      <div className="flex gap-8 mt-2 items-start">
        {/* ── Main content column ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-10">
          {(checklistItems ?? []).length > 0 && currentStage && !deal.is_archived && (
            <StageChecklist
              dealId={deal.id}
              stageName={currentStage.name}
              items={checklistItems ?? []}
              initialCompletedIds={(checklistProgress ?? []).map(p => p.checklist_item_id)}
            />
          )}

          <DealInfo deal={deal} />

          <section id="section-financials">
            <FinancialSnapshot dealId={deal.id} firmId={deal.firm_id} snapshots={snapshots ?? []} />
          </section>

          <section id="section-scoring">
            <ScoringSection
              dealId={deal.id}
              criteria={(scoringCriteriaResult.criteria ?? []) as any}
              initialScores={(dealScoresResult.scores ?? []) as any}
            />
          </section>

          <section id="section-notes" className="space-y-6">
            <NotesSection dealId={deal.id} section="overview" title="Overview" initialContent={getNote('overview')} highlight={!hasAnyNotes} />
            <NotesSection dealId={deal.id} section="risks" title="Risks" initialContent={getNote('risks')} placeholder="Document key risks and mitigation strategies…" />
            <NotesSection dealId={deal.id} section="notes" title="Notes" initialContent={getNote('notes')} placeholder="General notes, meeting summaries, follow-ups…" />
          </section>

          <section id="section-files">
            <FilesSection dealId={deal.id} files={files ?? []} />
          </section>

          <section id="section-contacts">
            <ContactsSection dealId={deal.id} initialDealContacts={(dealContacts ?? []) as any} />
          </section>

          <section id="section-activity">
            <DecisionLog events={events ?? []} snapshots={snapshots ?? []} />
          </section>
        </div>

        {/* ── Similar deals sidebar ── */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--lead)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Similar Deals
              </h3>
              {similarDeals.length > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--lead)', background: 'rgba(112,112,125,0.1)', border: '1px solid rgba(112,112,125,0.15)', borderRadius: '999px', padding: '1px 7px' }}>
                  {similarDeals.length}
                </span>
              )}
            </div>
            <SimilarDeals
              deals={similarDeals}
              currentDealType={deal.deal_type}
              currentMarket={deal.market}
              sidebar
            />
          </div>
        </div>
      </div>
    </div>
  )
}
