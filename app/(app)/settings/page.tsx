import { createClient } from '@/lib/supabase/server'
import StagesSettings from '@/components/settings/StagesSettings'
import KillReasonsSettings from '@/components/settings/KillReasonsSettings'
import TeamSettings from '@/components/settings/TeamSettings'
import BillingSettings from '@/components/settings/BillingSettings'
import ScoringCriteriaSettings from '@/components/settings/ScoringCriteriaSettings'
import BuyBoxSettings from '@/components/settings/BuyBoxSettings'
import { getAllScoringCriteria } from '@/lib/actions/scoring'
import { getBuyBoxes } from '@/lib/actions/buybox'
import { getStripe } from '@/lib/stripe'

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
  ] = await Promise.all([
    supabase.from('deal_stages').select('*').order('position'),
    supabase.from('kill_reasons').select('*').order('position'),
    supabase.from('profiles').select('id, full_name, email, role, created_at').eq('firm_id', firmId),
    supabase.from('invites').select('id, email, created_at, accepted_at').eq('firm_id', firmId).order('created_at', { ascending: false }),
    supabase.from('stage_checklist_items').select('*').order('position'),
    getAllScoringCriteria(),
    getBuyBoxes(),
  ])

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your workspace configuration.</p>
      </div>

      {success === 'true' && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 font-medium">
          You're subscribed! Welcome to Dealstash Team.
        </div>
      )}

      <BillingSettings
        isSubscribed={isSubscribed}
        cancelAtPeriodEnd={cancelAtPeriodEnd}
        currentPeriodEnd={currentPeriodEnd}
      />
      <TeamSettings
        members={members ?? []}
        invites={invites ?? []}
        firmName={firmName}
      />
      <StagesSettings stages={stages ?? []} checklistItems={checklistItems ?? []} />
      <KillReasonsSettings killReasons={killReasons ?? []} />
      <ScoringCriteriaSettings criteria={(scoringResult.criteria ?? []) as any} />
      <BuyBoxSettings buyBoxes={(buyBoxResult.buyBoxes ?? []) as any} />
    </div>
  )
}
