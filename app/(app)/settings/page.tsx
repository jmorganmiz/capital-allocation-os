import { createClient } from '@/lib/supabase/server'
import StagesSettings from '@/components/settings/StagesSettings'
import KillReasonsSettings from '@/components/settings/KillReasonsSettings'
import TeamSettings from '@/components/settings/TeamSettings'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, firms(name)')
    .eq('id', user?.id ?? '')
    .single()

  const firmId = profile?.firm_id ?? ''
  const firmName = (profile?.firms as any)?.name ?? 'My Firm'

  const [
    { data: stages },
    { data: killReasons },
    { data: members },
    { data: invites },
  ] = await Promise.all([
    supabase.from('deal_stages').select('*').order('position'),
    supabase.from('kill_reasons').select('*').order('position'),
    supabase.from('profiles').select('id, full_name, email, role, created_at').eq('firm_id', firmId),
    supabase.from('invites').select('id, email, created_at, accepted_at').eq('firm_id', firmId).order('created_at', { ascending: false }),
  ])

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your workspace configuration.</p>
      </div>
      <TeamSettings
        members={members ?? []}
        invites={invites ?? []}
        firmName={firmName}
      />
      <StagesSettings stages={stages ?? []} />
      <KillReasonsSettings killReasons={killReasons ?? []} />
    </div>
  )
}
