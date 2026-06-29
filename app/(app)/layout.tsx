import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MobileSidebar from '@/components/layout/MobileSidebar'
import Toaster from '@/components/ui/Toaster'
import AccessGate from '@/components/billing/AccessGate'
import TrialBanner from '@/components/billing/TrialBanner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, full_name, firms(name, trial_ends_at, stripe_subscription_status)')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) redirect('/onboarding')

  const firmName = (profile?.firms as any)?.name ?? 'My Firm'
  const trialEndsAt = (profile?.firms as any)?.trial_ends_at ?? null
  const subscriptionStatus = (profile?.firms as any)?.stripe_subscription_status ?? null
  const userEmail = user.email ?? ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#171721' }}>
      {/* Trial banner — full width, above sidebar */}
      <TrialBanner trialEndsAt={trialEndsAt} subscriptionStatus={subscriptionStatus} />

      {/* Sidebar + content row */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <MobileSidebar firmName={firmName} userEmail={userEmail} />
        <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }} className="pt-14 md:pt-0">
          <AccessGate trialEndsAt={trialEndsAt} subscriptionStatus={subscriptionStatus}>
            {children}
          </AccessGate>
        </main>
      </div>

      <Toaster />
    </div>
  )
}
