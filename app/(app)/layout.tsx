import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MobileSidebar from '@/components/layout/MobileSidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, full_name, firms(name)')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) redirect('/onboarding')

  const firmName = (profile?.firms as any)?.name ?? 'My Firm'
  const userEmail = user.email ?? ''

  return (
    <div className="flex h-screen bg-gray-50">
      <MobileSidebar firmName={firmName} userEmail={userEmail} />
      <main className="flex-1 overflow-auto md:pt-0 pt-14">
        {children}
      </main>
    </div>
  )
}
