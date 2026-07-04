import { createClient } from '@/lib/supabase/server'
import StagesSettings from '@/components/settings/StagesSettings'
import KillReasonsSettings from '@/components/settings/KillReasonsSettings'
import TeamSettings from '@/components/settings/TeamSettings'
import BillingSettings from '@/components/settings/BillingSettings'
import ScoringCriteriaSettings from '@/components/settings/ScoringCriteriaSettings'
import { getAllScoringCriteria } from '@/lib/actions/scoring'
import { getStripe } from '@/lib/stripe'
import BuyBoxSettings from '@/components/settings/BuyBoxSettings'
import { getBuyBoxes } from '@/lib/actions/buybox'
import FirmMemorySettings from '@/components/settings/FirmMemorySettings'
import UnderwritingAccessCard from '@/components/settings/UnderwritingAccessCard'
import UnderwritingQualityLab from '@/components/settings/UnderwritingQualityLab'

interface Props {
  searchParams: Promise<{ success?: string }>
}

export default async function SettingsPage({ searchParams }: Props) {
  const { success } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, firms(name, stripe_subscription_id)')
    .eq('id', user?.id ?? '')
    .single()

  const firmId = profile?.firm_id ?? ''
  const firmName = (profile?.firms as any)?.name ?? 'My Firm'
  const subscriptionId = (profile?.firms as any)?.stripe_subscription_id as string | null
  const isSubscribed = !!subscriptionId

  // Check if cancellation is already scheduled
  let cancelAtPeriodEnd = false
  let currentPeriodEnd: number | null = null
  if (subscriptionId) {
    try {
      const stripe = getStripe()
      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      cancelAtPeriodEnd = sub.cancel_at_period_end
      // current_period_end moved to subscription item level in Stripe v16+
      currentPeriodEnd = sub.items.data[0]?.current_period_end ?? null
    } catch {
      // Stripe unavailable or invalid subscription — degrade gracefully
    }
  }

  const [
    { data: stages },
    { data: killReasons },
    { data: members },
    { data: invites },
    { data: checklistItems },
    scoringResult,
    buyBoxResult,
    { data: firmMemories },
    { data: underwritingEntitlement },
    { data: underwritingAccessRequest },
    { data: underwritingFacts },
  ] = await Promise.all([
    supabase.from('deal_stages').select('*').order('position'),
    supabase.from('kill_reasons').select('*').order('position'),
    supabase.from('profiles').select('id, full_name, email, role, created_at').eq('firm_id', firmId),
    supabase.from('invites').select('id, email, created_at, accepted_at').eq('firm_id', firmId).order('created_at', { ascending: false }),
    supabase.from('stage_checklist_items').select('*').order('position'),
    getAllScoringCriteria(),
    getBuyBoxes(),
    supabase
      .from('firm_memories')
      .select('id, source_question, content, feedback_type, tags, created_at, updated_at')
      .eq('firm_id', firmId)
      .in('feedback_type', ['saved', 'correction', 'firm_rule'])
      .order('updated_at', { ascending: false }),
    supabase.from('firm_entitlements').select('*').eq('firm_id', firmId).maybeSingle(),
    supabase.from('underwriting_access_requests').select('*').eq('firm_id', firmId).maybeSingle(),
    supabase.from('underwriting_assumptions').select('run_id, approval_status, source_type, confidence').eq('firm_id', firmId).limit(5000),
  ])
  const underwritingPeriodStart = underwritingEntitlement?.current_period_start ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const underwritingPeriodEnd = underwritingEntitlement?.current_period_end ?? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
  const { data: underwritingUsageRuns } = underwritingEntitlement?.underwriting_enabled
    ? await supabase.from('underwriting_runs')
      .select('status, credits_reserved, credits_settled')
      .eq('run_type', 'full_underwrite')
      .like('model_version', 'full-underwrite-billable-%')
      .gte('created_at', underwritingPeriodStart)
      .lt('created_at', underwritingPeriodEnd)
    : { data: [] }
  const underwritingCreditsUsed = (underwritingUsageRuns ?? [])
    .filter((item) => !(item.status === 'failed' || item.status === 'canceled') || item.credits_settled > 0)
    .reduce((total, item) => total + Number(item.credits_reserved), 0)
  const documentFacts = (underwritingFacts ?? []).filter((fact) => ['om_stated', 'rent_roll', 't12', 'public_record', 'analyst_override'].includes(fact.source_type))
  const reviewedFacts = documentFacts.filter((fact) => fact.approval_status !== 'needs_review')
  const confidenceValues = documentFacts.map((fact) => Number(fact.confidence)).filter(Number.isFinite)
  const qualityMetrics = {
    runs: new Set(documentFacts.map((fact) => fact.run_id)).size,
    facts: documentFacts.length,
    reviewed: reviewedFacts.length,
    approved: reviewedFacts.filter((fact) => fact.approval_status === 'approved').length,
    rejected: reviewedFacts.filter((fact) => fact.approval_status === 'rejected').length,
    revised: documentFacts.filter((fact) => fact.source_type === 'analyst_override').length,
    averageConfidence: confidenceValues.length ? confidenceValues.reduce((total, value) => total + value, 0) / confidenceValues.length : null,
  }

  return (
    <div className="app-page">
      <div className="app-page-header">
        <p className="app-eyebrow">Workspace</p>
        <h1 className="app-title">Settings</h1>
        <p className="app-subtitle">Manage your firm configuration, team, pipeline rules, and billing.</p>
      </div>

      {success === 'true' && (
        <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: '13px', color: '#4ade80', fontWeight: 500 }}>
          You're subscribed! Welcome to Dealstash Team.
        </div>
      )}

      <div className="app-settings-grid">
        <nav className="app-settings-nav" aria-label="Settings sections">
          <div className="px-3 py-2">
            <p style={{ color: 'var(--app-faint)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Configuration</p>
          </div>
          <a href="#billing">Billing</a>
          <a href="#underwriting-beta">Underwriting Pro</a>
          <a href="#quality-lab">OM Quality</a>
          <a href="#team">Team</a>
          <a href="#buy-box">Buy Box</a>
          <a href="#firm-memory">Firm Memory</a>
          <a href="#pipeline-rules">Pipeline</a>
          <a href="#kill-reasons">Kill Reasons</a>
          <a href="#scoring">Scoring</a>
          <div className="mt-2 rounded-lg p-3" style={{ background: 'rgba(82,102,235,0.08)', border: '1px solid rgba(82,102,235,0.18)' }}>
            <p style={{ color: 'var(--ghost-blue)', fontSize: '12px', fontWeight: 600 }}>Workspace rules</p>
            <p style={{ color: 'var(--app-faint)', fontSize: '11px', lineHeight: 1.5, marginTop: '4px' }}>These settings control how every deal is scored, staged, and remembered.</p>
          </div>
        </nav>

        <div className="app-settings-stack">
          <section id="billing" className="app-section-anchor">
            <BillingSettings
              isSubscribed={isSubscribed}
              cancelAtPeriodEnd={cancelAtPeriodEnd}
              currentPeriodEnd={currentPeriodEnd}
              underwritingEnabled={Boolean(underwritingEntitlement?.underwriting_enabled)}
              underwritingAllowance={underwritingEntitlement?.monthly_underwrite_allowance ?? 0}
              underwritingCreditsUsed={underwritingCreditsUsed}
            />
          </section>
          <section id="underwriting-beta" className="app-section-anchor">
            <UnderwritingAccessCard enabled={Boolean(underwritingEntitlement?.underwriting_enabled)} initialRequest={underwritingAccessRequest ?? null} />
          </section>
          <section id="quality-lab" className="app-section-anchor">
            <UnderwritingQualityLab metrics={qualityMetrics} />
          </section>
          <section id="team" className="app-section-anchor">
            <TeamSettings
              members={members ?? []}
              invites={invites ?? []}
              firmName={firmName}
            />
          </section>
          <section id="buy-box" className="app-section-anchor">
            <BuyBoxSettings buyBoxes={buyBoxResult.buyBoxes ?? []} />
          </section>
          <section id="firm-memory" className="app-section-anchor">
            <FirmMemorySettings initialMemories={(firmMemories ?? []) as any} />
          </section>
          <section id="pipeline-rules" className="app-section-anchor">
            <StagesSettings stages={stages ?? []} checklistItems={checklistItems ?? []} />
          </section>
          <section id="kill-reasons" className="app-section-anchor">
            <KillReasonsSettings killReasons={killReasons ?? []} />
          </section>
          <section id="scoring" className="app-section-anchor">
            <ScoringCriteriaSettings criteria={(scoringResult.criteria ?? []) as any} />
          </section>
        </div>
      </div>
    </div>
  )
}
