import { createClient } from '@/lib/supabase/server'
import StagesSettings from '@/components/settings/StagesSettings'
import KillReasonsSettings from '@/components/settings/KillReasonsSettings'

export default async function SettingsPage() {
  const supabase = await createClient()

  const [{ data: stages }, { data: killReasons }] = await Promise.all([
    supabase.from('deal_stages').select('*').order('position'),
    supabase.from('kill_reasons').select('*').order('position'),
  ])

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Firm Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your pipeline configuration.</p>
      </div>
      <StagesSettings stages={stages ?? []} />
      <KillReasonsSettings killReasons={killReasons ?? []} />
    </div>
  )
}
