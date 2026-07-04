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
import SimilarDeals from '@/components/deal/SimilarDeals'
import QuickPencil from '@/components/deal/QuickPencil'
import UnderwritingRoom from '@/components/deal/UnderwritingRoom'
import FullUnderwriteExecution from '@/components/deal/FullUnderwriteExecution'
import PortfolioActuals from '@/components/deal/PortfolioActuals'
import { getScoringCriteria, getDealScores } from '@/lib/actions/scoring'
import { createClient } from '@/lib/supabase/server'

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
    { data: underwritingRuns },
    { data: entitlement },
    { data: fullUnderwritingRuns },
    { data: fullExecutionRuns },
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
    supabase
      .from('underwriting_runs')
      .select('*')
      .eq('deal_id', id)
      .eq('run_type', 'quick_pencil')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('firm_entitlements')
      .select('*')
      .maybeSingle(),
    supabase
      .from('underwriting_runs')
      .select('*')
      .eq('deal_id', id)
      .eq('run_type', 'preflight')
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('underwriting_runs')
      .select('*')
      .eq('deal_id', id)
      .eq('run_type', 'full_underwrite')
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const dealStageId = deal?.stage_id ?? null
  const latestFullRun = fullUnderwritingRuns?.[0] ?? null
  const latestExecutionRun = fullExecutionRuns?.[0] ?? null
  const { data: portfolioActuals } = await supabase.from('portfolio_actuals').select('*').eq('deal_id', id).order('period_date', { ascending: false })
  const executionOutput = latestExecutionRun?.output_snapshot && typeof latestExecutionRun.output_snapshot === 'object' && !Array.isArray(latestExecutionRun.output_snapshot)
    ? latestExecutionRun.output_snapshot as Record<string, unknown>
    : null
  const noiByYear = Array.isArray(executionOutput?.noiByYear) ? executionOutput.noiByYear : []
  const underwrittenYearOneNoi = Number.isFinite(Number(noiByYear[0])) ? Number(noiByYear[0]) : null
  const billingPeriodStart = entitlement?.current_period_start ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const billingPeriodEnd = entitlement?.current_period_end ?? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
  const { data: allowanceRuns } = entitlement?.underwriting_enabled
    ? await supabase.from('underwriting_runs')
      .select('parent_run_id, status, credits_reserved, credits_settled, model_version')
      .eq('run_type', 'full_underwrite')
      .like('model_version', 'full-underwrite-billable-%')
      .gte('created_at', billingPeriodStart)
      .lt('created_at', billingPeriodEnd)
    : { data: [] }
  const usedUnderwriteCredits = (allowanceRuns ?? [])
    .filter((item) => !(item.status === 'failed' || item.status === 'canceled') || item.credits_settled > 0)
    .reduce((total, item) => total + Number(item.credits_reserved), 0)
  const { count: currentRevisionCount } = latestFullRun && entitlement?.underwriting_enabled
    ? await supabase.from('underwriting_runs')
      .select('id', { count: 'exact', head: true })
      .eq('parent_run_id', latestFullRun.id)
      .eq('run_type', 'full_underwrite')
      .like('model_version', 'full-underwrite-billable-%')
      .not('status', 'in', '(failed,canceled)')
    : { count: 0 }
  const [{ data: checklistItems }, { data: checklistProgress }] = await Promise.all([
    dealStageId
      ? supabase.from('stage_checklist_items').select('*').eq('stage_id', dealStageId).order('position')
      : Promise.resolve({ data: [] }),
    supabase.from('deal_checklist_progress').select('checklist_item_id').eq('deal_id', id),
  ])
  const { data: initialUnderwritingSteps } = latestFullRun
    ? await supabase.from('underwriting_steps').select('*').eq('run_id', latestFullRun.id).order('position')
    : { data: [] }
  const { data: initialUnderwritingAssumptions } = latestFullRun
    ? await supabase.from('underwriting_assumptions').select('*').eq('run_id', latestFullRun.id).order('created_at')
    : { data: [] }
  const { data: initialExecutionSteps } = latestExecutionRun
    ? await supabase.from('underwriting_steps').select('*').eq('run_id', latestExecutionRun.id).order('position')
    : { data: [] }
  const { data: initialExecutionAssumptions } = latestExecutionRun
    ? await supabase.from('underwriting_assumptions').select('*').eq('run_id', latestExecutionRun.id).order('created_at')
    : { data: [] }

  const [scoringCriteriaResult, dealScoresResult] = await Promise.all([
    getScoringCriteria(),
    getDealScores(id),
  ])

  if (!deal) notFound()

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
    .map((d) => {
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

  const { data: firmUsers } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('firm_id', deal.firm_id)

  const currentStage = stages?.find((stage) => stage.id === deal.stage_id)
  const getNote = (section: string) => notes?.find((note) => note.section === section)?.content ?? ''
  const hasAnyNotes = (notes ?? []).some((note) => note.content?.trim().length > 0)
  const latestSnapshot = snapshots?.[0]
  const purchasePrice = Number(latestSnapshot?.purchase_price ?? deal.asking_price ?? 0)
  const totalUnits = Number(latestSnapshot?.num_units ?? 0)
  const statedNoi = Number(latestSnapshot?.noi ?? 0)
  const estimatedCurrentRent = totalUnits > 0 && statedNoi > 0
    ? Math.max(500, Math.round((statedNoi / 0.58 / 0.93) / totalUnits / 12))
    : 1200

  return (
    <div className="app-page app-deal-page">
      <DealHeader
        deal={deal}
        stages={stages ?? []}
        killReasons={killReasons ?? []}
        currentStage={currentStage}
        firmUsers={firmUsers ?? []}
      />

      <DealTabs showUnderwriting={Boolean(entitlement?.underwriting_enabled)} />

      <div className="app-workspace-grid app-deal-grid">
        <div className="app-deal-main">
          {(checklistItems ?? []).length > 0 && currentStage && !deal.is_archived && (
            <StageChecklist
              dealId={deal.id}
              stageName={currentStage.name}
              items={checklistItems ?? []}
              initialCompletedIds={(checklistProgress ?? []).map((progress) => progress.checklist_item_id)}
            />
          )}

          <DealInfo deal={deal} />

          <section id="section-financials" className="app-deal-section">
            <FinancialSnapshot dealId={deal.id} firmId={deal.firm_id} snapshots={snapshots ?? []} />
          </section>

          {entitlement?.underwriting_enabled && (
            <section id="section-underwriting" className="app-underwriting-section app-underwriting-stack">
              <QuickPencil
                dealId={deal.id}
                entitlementLabel={entitlement.plan_key === 'underwriting_beta' ? 'Beta' : 'Active'}
                monthlyAllowance={entitlement.monthly_underwrite_allowance}
                initialRuns={underwritingRuns ?? []}
                defaults={{
                  purchasePrice,
                  totalUnits,
                  currentRent: estimatedCurrentRent,
                  marketRent: Math.round(estimatedCurrentRent * 1.12),
                  fixedOperatingExpenses: Math.round(Math.max(0, totalUnits * 1700)),
                  propertyTaxes: Math.round(purchasePrice * 0.0185),
                  insurance: Math.round(totalUnits * 300),
                  ltv: Number(latestSnapshot?.ltv ?? 0.65),
                  interestRate: Number(latestSnapshot?.debt_rate ?? 0.065),
                }}
              />
              <UnderwritingRoom
                dealId={deal.id}
                initialRun={latestFullRun}
                initialSteps={initialUnderwritingSteps ?? []}
                initialAssumptions={initialUnderwritingAssumptions ?? []}
              />
              <FullUnderwriteExecution
                dealId={deal.id}
                preflightRun={latestFullRun}
                initialRun={latestExecutionRun}
                initialSteps={initialExecutionSteps ?? []}
                initialAssumptions={initialExecutionAssumptions ?? []}
                monthlyAllowance={entitlement.monthly_underwrite_allowance}
                usedCredits={usedUnderwriteCredits}
                revisionCount={currentRevisionCount ?? 0}
              />
            </section>
          )}
          <section id="section-actuals" className="app-section-anchor">
            <PortfolioActuals dealId={id} initialActuals={portfolioActuals ?? []} underwrittenYearOneNoi={underwrittenYearOneNoi} />
          </section>

          <section id="section-scoring" className="app-deal-section">
            <ScoringSection
              dealId={deal.id}
              criteria={(scoringCriteriaResult.criteria ?? []) as any}
              initialScores={(dealScoresResult.scores ?? []) as any}
            />
          </section>

          <section id="section-notes" className="app-deal-section app-deal-notes-stack">
            <NotesSection dealId={deal.id} section="overview" title="Overview" initialContent={getNote('overview')} highlight={!hasAnyNotes} />
            <NotesSection dealId={deal.id} section="risks" title="Risks" initialContent={getNote('risks')} placeholder="Document key risks and mitigation strategies..." />
            <NotesSection dealId={deal.id} section="notes" title="Notes" initialContent={getNote('notes')} placeholder="General notes, meeting summaries, follow-ups..." />
          </section>

          <section id="section-files" className="app-deal-section">
            <FilesSection dealId={deal.id} files={files ?? []} />
          </section>

          <section id="section-contacts" className="app-deal-section">
            <ContactsSection dealId={deal.id} initialDealContacts={(dealContacts ?? []) as any} />
          </section>

          <section id="section-activity" className="app-deal-section">
            <DecisionLog events={events ?? []} snapshots={snapshots ?? []} />
          </section>
        </div>

        <aside id="section-similar" className="app-deal-rail">
          <div className="app-deal-rail-card">
            <div className="app-deal-rail-header">
              <div>
                <p>Deal memory</p>
                <h3>Similar Deals</h3>
              </div>
              <span>{similarDeals.length}</span>
            </div>
            <SimilarDeals
              deals={similarDeals}
              currentDealType={deal.deal_type}
              currentMarket={deal.market}
              sidebar
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
