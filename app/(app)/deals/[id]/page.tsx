import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DealHeader from '@/components/deal/DealHeader'
import DealTabs from '@/components/deal/DealTabs'
import NotesSection from '@/components/deal/NotesSection'
import FilesSection from '@/components/deal/FilesSection'
import DecisionLog from '@/components/deal/DecisionLog'
import FinancialSnapshot from '@/components/deal/FinancialSnapshot'
import DealInfo from '@/components/deal/DealInfo'
import ContactsSection from '@/components/deal/ContactsSection'
import ScoringSection from '@/components/deal/ScoringSection'
import { getScoringCriteria, getDealScores } from '@/lib/actions/scoring'

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

  const [scoringCriteriaResult, dealScoresResult] = await Promise.all([
    getScoringCriteria(),
    getDealScores(id),
  ])

  if (!deal) notFound()

  // Get firm users for owner dropdown
  const { data: firmUsers } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('firm_id', deal.firm_id)

  const currentStage = stages?.find(s => s.id === deal.stage_id)
  const getNote = (section: string) => notes?.find(n => n.section === section)?.content ?? ''

  const hasAnyNotes = (notes ?? []).some(n => n.content?.trim().length > 0)

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <DealHeader
        deal={deal}
        stages={stages ?? []}
        killReasons={killReasons ?? []}
        currentStage={currentStage}
        firmUsers={firmUsers ?? []}
      />

      <DealTabs />

      <div className="space-y-8">
        {/* Notes */}
        <section id="section-notes" className="space-y-6">
          <NotesSection
            dealId={deal.id}
            section="overview"
            title="Overview"
            initialContent={getNote('overview')}
            highlight={!hasAnyNotes}
          />
          <NotesSection
            dealId={deal.id}
            section="risks"
            title="Risks"
            initialContent={getNote('risks')}
            placeholder="Document key risks and mitigation strategies…"
          />
          <NotesSection
            dealId={deal.id}
            section="notes"
            title="Notes"
            initialContent={getNote('notes')}
            placeholder="General notes, meeting summaries, follow-ups…"
          />
        </section>

        {/* Deal Info */}
        <DealInfo deal={deal} />

        {/* Financials */}
        <section id="section-financials">
          <FinancialSnapshot
            dealId={deal.id}
            firmId={deal.firm_id}
            snapshots={snapshots ?? []}
          />
        </section>

        {/* Scoring */}
        <section id="section-scoring">
          <ScoringSection
            dealId={deal.id}
            criteria={(scoringCriteriaResult.criteria ?? []) as any}
            initialScores={(dealScoresResult.scores ?? []) as any}
          />
        </section>

        {/* Files */}
        <section id="section-files">
          <FilesSection
            dealId={deal.id}
            files={files ?? []}
          />
        </section>

        {/* Contacts */}
        <section id="section-contacts">
          <ContactsSection
            dealId={deal.id}
            initialDealContacts={(dealContacts ?? []) as any}
          />
        </section>

        {/* Activity */}
        <section id="section-activity">
          <DecisionLog events={events ?? []} snapshots={snapshots ?? []} />
        </section>
      </div>
    </div>
  )
}
