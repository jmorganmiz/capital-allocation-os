'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { assertFirmAccess } from '@/lib/billing-access'

export async function requestUnderwritingAccess(input: {
  teamSize: number
  monthlyDealVolume: number
  workflowNotes: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase.from('profiles').select('firm_id, role').eq('id', user.id).single()
  if (!profile?.firm_id) return { error: 'Profile not found.' }

  if (!['admin', 'partner'].includes(profile.role ?? '')) return { error: 'Administrator or partner access required.' }

  const accessError = await assertFirmAccess(supabase, profile.firm_id)
  if (accessError) return { error: accessError }

  const teamSize = Math.round(Number(input.teamSize))
  const monthlyDealVolume = Math.round(Number(input.monthlyDealVolume))
  const workflowNotes = input.workflowNotes.trim().slice(0, 2000)
  if (!Number.isFinite(teamSize) || teamSize < 1 || teamSize > 1000) return { error: 'Enter a valid team size.' }
  if (!Number.isFinite(monthlyDealVolume) || monthlyDealVolume < 0 || monthlyDealVolume > 100000) return { error: 'Enter a valid monthly deal volume.' }

  const admin = createAdminClient()
  const { data: entitlement } = await admin.from('firm_entitlements').select('underwriting_enabled').eq('firm_id', profile.firm_id).maybeSingle()
  if (entitlement?.underwriting_enabled) return { error: 'Underwriting Pro is already enabled for this firm.' }

  const { data, error } = await admin.from('underwriting_access_requests').upsert({
    firm_id: profile.firm_id,
    requested_by: user.id,
    status: 'pending',
    team_size: teamSize,
    monthly_deal_volume: monthlyDealVolume,
    workflow_notes: workflowNotes || null,
    reviewed_by: null,
    reviewed_at: null,
  }, { onConflict: 'firm_id' }).select('*').single()

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { request: data }
}
