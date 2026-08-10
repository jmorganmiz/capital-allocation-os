'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/platform-admin'

async function adminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isPlatformAdmin(user.email)) return { error: 'Platform administrator access required.' as const }
  return { user }
}

export async function approveUnderwritingRequest(requestId: string, allowance = 25, includedSeats = 5) {
  const context = await adminContext()
  if ('error' in context) return context
  const admin = createAdminClient()
  const { error } = await admin.rpc('approve_underwriting_access_request', {
    p_request_id: requestId,
    p_reviewer_id: context.user.id,
    p_allowance: allowance,
    p_included_seats: includedSeats,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/underwriting')
  return {}
}

export async function declineUnderwritingRequest(requestId: string) {
  const context = await adminContext()
  if ('error' in context) return context
  const admin = createAdminClient()
  const { error } = await admin.from('underwriting_access_requests').update({ status: 'declined', reviewed_by: context.user.id, reviewed_at: new Date().toISOString() }).eq('id', requestId).eq('status', 'pending')
  if (error) return { error: error.message }
  revalidatePath('/admin/underwriting')
  return {}
}
export async function requeueUnderwritingRun(runId: string) {
  const context = await adminContext()
  if ('error' in context) return context
  const admin = createAdminClient()
  const { data: run } = await admin
    .from('underwriting_runs')
    .select('id, run_type, status')
    .eq('id', runId)
    .in('run_type', ['preflight', 'full_underwrite'])
    .maybeSingle()
  if (!run) return { error: 'Underwriting run not found.' }
  if (['completed', 'canceled', 'needs_review'].includes(run.status)) return { error: 'Only failed or active processing runs can be requeued.' }

  const staleCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const [{ data: failedSteps, error: failedError }, { data: staleSteps, error: staleError }] = await Promise.all([
    admin
      .from('underwriting_steps')
      .update({
        status: 'queued',
        started_at: null,
        completed_at: null,
        error_code: 'ADMIN_REQUEUED',
        error_message: 'Requeued by platform operations.',
      })
      .eq('run_id', runId)
      .eq('status', 'failed')
      .lt('attempts', 3)
      .select('id'),
    admin
      .from('underwriting_steps')
      .update({
        status: 'queued',
        started_at: null,
        completed_at: null,
        error_code: 'ADMIN_REQUEUED_STALE',
        error_message: 'Recovered by platform operations after a stale worker state.',
      })
      .eq('run_id', runId)
      .eq('status', 'running')
      .lt('started_at', staleCutoff)
      .select('id'),
  ])
  if (failedError || staleError) return { error: failedError?.message ?? staleError?.message ?? 'Could not requeue run.' }

  const requeued = (failedSteps?.length ?? 0) + (staleSteps?.length ?? 0)
  if (!requeued) return { error: 'No retryable failed or stale workstreams were found.' }
  const { error } = await admin.from('underwriting_runs').update({
    status: 'running',
    error_code: null,
    error_message: null,
    completed_at: null,
  }).eq('id', runId)
  if (error) return { error: error.message }
  revalidatePath('/admin/underwriting')
  return { requeued }
}
