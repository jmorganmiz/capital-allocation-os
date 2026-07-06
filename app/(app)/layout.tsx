import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MobileSidebar from '@/components/layout/MobileSidebar'
import Toaster from '@/components/ui/Toaster'
import AccessGate from '@/components/billing/AccessGate'
import AnalystDrawer from '@/components/analyst/AnalystDrawer'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, full_name, firms(name, trial_ends_at, stripe_subscription_status, comp_access)')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) redirect('/onboarding')

  const firmName = (profile?.firms as any)?.name ?? 'My Firm'
  const trialEndsAt = (profile?.firms as any)?.trial_ends_at ?? null
  const subscriptionStatus = (profile?.firms as any)?.stripe_subscription_status ?? null
  const compAccess = Boolean((profile?.firms as any)?.comp_access)
  const userEmail = user.email ?? ''

  return (
    <div className="app-root flex h-screen" style={{ background: '#0c0c14' }}>
      <MobileSidebar firmName={firmName} userEmail={userEmail} />
      <main className="flex-1 min-w-0 overflow-auto md:pt-0 pt-14">
        <AccessGate trialEndsAt={trialEndsAt} subscriptionStatus={subscriptionStatus} compAccess={compAccess}>
          {children}
        </AccessGate>
      </main>
      <AnalystDrawer />
      <Toaster />
    </div>
  )
}
