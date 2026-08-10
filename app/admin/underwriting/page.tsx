import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import UnderwritingOpsMonitor from '@/components/admin/UnderwritingOpsMonitor'
import UnderwritingRequestQueue from '@/components/admin/UnderwritingRequestQueue'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/platform-admin'

export default async function UnderwritingAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isPlatformAdmin(user.email)) notFound()

  const admin = createAdminClient()
  const [{ data: accessRequests }, { data: recentRuns }] = await Promise.all([
    admin.from('underwriting_access_requests').select('id, requested_by, status, team_size, monthly_deal_volume, workflow_notes, created_at, firms(name)').order('created_at', { ascending: false }),
    admin
      .from('underwriting_runs')
      .select('id, run_type, status, error_code, error_message, credits_reserved, credits_settled, created_at, updated_at, started_at, completed_at, firms(name), deals(title, market), underwriting_steps(status, attempts, started_at, error_code, error_message)')
      .in('run_type', ['preflight', 'full_underwrite'])
      .order('updated_at', { ascending: false })
      .limit(30),
  ])
  const requesterIds = [...new Set((accessRequests ?? []).map((item) => item.requested_by))]
  const { data: requesters } = requesterIds.length
    ? await admin.from('profiles').select('id, full_name, email').in('id', requesterIds)
    : { data: [] }
  const requesterById = new Map((requesters ?? []).map((profile) => [profile.id, profile]))
  const requests = (accessRequests ?? []).map((request) => ({ ...request, profiles: requesterById.get(request.requested_by) ?? null }))

  return (
    <div className="app-root min-h-screen">
      <main className="app-page">
        <div className="app-page-header">
          <p className="app-eyebrow">Platform operations</p>
          <h1 className="app-title">Underwriting Early Access</h1>
          <p className="app-subtitle">Review firm fit, monitor live runs, and rescue failed workstreams before customers need support.</p>
          <Link href="/settings" className="app-admin-back">Return to workspace</Link>
        </div>
        <UnderwritingOpsMonitor initialRuns={(recentRuns ?? []) as any} />
        <div className="app-admin-section-gap" />
        <UnderwritingRequestQueue initialRequests={requests as any} />
      </main>
    </div>
  )
}
