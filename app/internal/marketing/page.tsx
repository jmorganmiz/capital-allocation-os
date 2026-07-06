import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getInternalContext, can } from '@/lib/internal/auth'
import MarketingBoard from '@/components/internal/MarketingBoard'

export default async function InternalMarketingPage() {
  const context = await getInternalContext()
  if (!context || !can(context, 'marketing')) notFound()

  const admin = createAdminClient()
  const [{ data: campaigns }, { data: outreach }, { data: firms }, { data: firmDeals }] = await Promise.all([
    context.supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
    context.supabase.from('outreach_contacts').select('*, campaigns(name)').order('created_at', { ascending: false }).limit(200),
    admin.from('firms').select('id, created_at, stripe_subscription_status, lead_source_campaign_id'),
    admin.from('deals').select('firm_id').limit(5000),
  ])

  // Funnel: signup -> activated (has at least one deal) -> paying.
  // Visits need an analytics integration; shown as unavailable for now.
  const activatedFirmIds = new Set((firmDeals ?? []).map((deal) => deal.firm_id))
  const funnel = {
    signups: (firms ?? []).length,
    activated: (firms ?? []).filter((firm) => activatedFirmIds.has(firm.id)).length,
    paying: (firms ?? []).filter((firm) => firm.stripe_subscription_status === 'active').length,
  }

  // Attribution: signups per campaign.
  const attributedByCampaign = new Map<string, number>()
  for (const firm of firms ?? []) {
    if (firm.lead_source_campaign_id) {
      attributedByCampaign.set(firm.lead_source_campaign_id, (attributedByCampaign.get(firm.lead_source_campaign_id) ?? 0) + 1)
    }
  }

  return (
    <MarketingBoard
      campaigns={(campaigns ?? []).map((campaign: { id: string }) => ({
        ...campaign,
        attributed_signups: attributedByCampaign.get(campaign.id) ?? 0,
      })) as never[]}
      outreach={(outreach ?? []) as never[]}
      funnel={funnel}
      canWrite={can(context, 'marketing', 'write')}
    />
  )
}
