'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDealStage(name: string, position: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data, error } = await supabase
    .from('deal_stages')
    .insert({ firm_id: profile.firm_id, name, position })
    .select().single()

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { stage: data }
}

export async function updateDealStage(id: string, updates: { name?: string; position?: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('deal_stages')
    .update(updates)
    .eq('id', id)
    .eq('firm_id', profile.firm_id)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function deleteDealStage(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('deal_stages')
    .delete()
    .eq('id', id)
    .eq('firm_id', profile.firm_id)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function createKillReason(name: string, position: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data, error } = await supabase
    .from('kill_reasons')
    .insert({ firm_id: profile.firm_id, name, position })
    .select().single()

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { reason: data }
}

export async function updateKillReason(id: string, updates: { name?: string; position?: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('kill_reasons')
    .update(updates)
    .eq('id', id)
    .eq('firm_id', profile.firm_id)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function deleteKillReason(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('kill_reasons')
    .delete()
    .eq('id', id)
    .eq('firm_id', profile.firm_id)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function inviteTeamMember(email: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, firms(name)')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found' }

  // Check if already a member
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('firm_id', profile.firm_id)
    .eq('email', email)
    .single()

  if (existing) return { error: 'This person is already on your team.' }

  // Check if already invited
  const { data: existingInvite } = await supabase
    .from('invites')
    .select('id, accepted_at')
    .eq('firm_id', profile.firm_id)
    .eq('email', email)
    .is('accepted_at', null)
    .single()

  if (existingInvite) return { error: 'An invite is already pending for this email.' }

  // Create invite
  const { data: invite, error: inviteError } = await supabase
    .from('invites')
    .insert({
      firm_id: profile.firm_id,
      email,
      invited_by: user.id,
    })
    .select()
    .single()

  if (inviteError) return { error: inviteError.message }

  // Send invite email via Supabase
  const firmName = (profile.firms as any)?.name ?? 'your team'
  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://getdealstash.com'}/signup?invite=${invite.token}&email=${encodeURIComponent(email)}`

  const adminClient = createAdminClient()
  const { error: emailError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      firm_id: profile.firm_id,
      invite_token: invite.token,
    },
    redirectTo: inviteUrl,
  })

  if (emailError) return { error: emailError.message }

  return { invite }
}
