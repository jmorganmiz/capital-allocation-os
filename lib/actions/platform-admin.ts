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
