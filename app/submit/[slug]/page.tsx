import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getAccessState } from '@/lib/workflow.mjs'
import BrokerSubmitForm from '@/components/portal/BrokerSubmitForm'

export const dynamic = 'force-dynamic'

async function loadPortalFirm(slug: string) {
  const admin = createAdminClient()
  const { data: firm } = await admin
    .from('firms')
    .select('id, name, inbox_email, broker_portal_enabled, trial_ends_at, stripe_subscription_status, comp_access')
    .eq('inbox_slug', slug)
    .maybeSingle()
  if (!firm?.broker_portal_enabled) return null
  const access = getAccessState({ trialEndsAt: firm.trial_ends_at, subscriptionStatus: firm.stripe_subscription_status, compAccess: firm.comp_access })
  if (!access.allowed) return null

  const { data: boxes } = await admin
    .from('buy_boxes')
    .select('asset_type, preferred_markets')
    .eq('firm_id', firm.id)
  return { firm, boxes: boxes ?? [] }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const portal = await loadPortalFirm(slug)
  return { title: portal ? `Submit a deal to ${portal.firm.name} | Dealstash` : 'Submit a deal | Dealstash' }
}

export default async function BrokerPortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const portal = await loadPortalFirm(slug)
  if (!portal) notFound()

  const { firm, boxes } = portal
  const assetTypes = [...new Set(boxes.map((box) => box.asset_type).filter(Boolean))]
  const markets = [...new Set(boxes.flatMap((box) => String(box.preferred_markets ?? '').split(',').map((m) => m.trim()).filter(Boolean)))]

  return (
    <div className="min-h-screen" style={{ background: '#0c0c14', color: '#e7e7ee' }}>
      <main className="mx-auto w-full max-w-2xl px-5 py-14">
        <p className="text-xs font-semibold uppercase" style={{ letterSpacing: '0.08em', color: '#8b8b9a' }}>Dealstash Broker Portal</p>
        <h1 className="mt-2 text-3xl font-bold" style={{ color: '#f4f4f8' }}>Submit a deal to {firm.name}</h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: '#a8a8b8' }}>
          Deals submitted here go straight into {firm.name}&apos;s acquisition workflow and are screened against their
          investment criteria. You&apos;ll hear back if it fits.
        </p>

        {(assetTypes.length > 0 || markets.length > 0) && (
          <div className="mt-6 rounded-lg border p-4" style={{ borderColor: 'rgba(112,112,125,0.25)', background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs font-semibold uppercase" style={{ letterSpacing: '0.06em', color: '#8b8b9a' }}>What {firm.name} buys</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {assetTypes.map((type) => (
                <span key={type} className="rounded-full px-3 py-1 text-xs" style={{ background: 'rgba(99,102,241,0.15)', color: '#c7d2fe' }}>{type}</span>
              ))}
              {markets.map((m) => (
                <span key={m} className="rounded-full px-3 py-1 text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: '#c3c3d0' }}>{m}</span>
              ))}
            </div>
          </div>
        )}

        <BrokerSubmitForm slug={slug} firmName={firm.name} />

        {firm.inbox_email && (
          <p className="mt-8 text-sm" style={{ color: '#8b8b9a' }}>
            Have an OM or flyer? Email it with the PDF attached to{' '}
            <a href={`mailto:${firm.inbox_email}`} className="underline" style={{ color: '#c7d2fe' }}>{firm.inbox_email}</a>
            {' '}and it will be parsed into their pipeline automatically.
          </p>
        )}
      </main>
    </div>
  )
}
