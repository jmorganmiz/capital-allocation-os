import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import UnderwritingRequestQueue from '@/components/admin/UnderwritingRequestQueue'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/platform-admin'

export default async function UnderwritingAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isPlatformAdmin(user.email)) notFound()
  const admin = createAdminClient()
  const { data } = await admin.from('underwriting_access_requests').select('id, requested_by, status, team_size, monthly_deal_volume, workflow_notes, created_at, firms(name)').order('created_at', { ascending: false })
  const requesterIds = [...new Set((data ?? []).map((item) => item.requested_by))]
  const { data: requesters } = requesterIds.length
    ? await admin.from('profiles').select('id, full_name, email').in('id', requesterIds)
    : { data: [] }
  const requesterById = new Map((requesters ?? []).map((profile) => [profile.id, profile]))
  const requests = (data ?? []).map((request) => ({ ...request, profiles: requesterById.get(request.requested_by) ?? null }))
  return <div className="app-root min-h-screen"><main className="app-page"><div className="app-page-header"><p className="app-eyebrow">Platform operations</p><h1 className="app-title">Underwriting beta</h1><p className="app-subtitle">Review firm fit before enabling customer-visible allowances.</p><Link href="/settings" className="app-admin-back">← Return to workspace</Link></div><UnderwritingRequestQueue initialRequests={requests as any} /></main></div>
}
