'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUpAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const firmName = formData.get('firm_name') as string
  const inviteToken = formData.get('invite_token') as string | null

  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (authError) return { error: authError.message }
  if (!authData.user) return { error: 'Signup failed' }

  const userId = authData.user.id

  if (inviteToken) {
    // Join existing firm via invite
    const { data: invite } = await adminClient
      .from('invites')
      .select('firm_id')
      .eq('token', inviteToken)
      .is('accepted_at', null)
      .single()

    if (!invite) return { error: 'Invalid or expired invite link.' }

    await adminClient.from('profiles').upsert({
      id: userId,
      firm_id: invite.firm_id,
      full_name: fullName,
      email,
      role: 'member',
    })

    await adminClient
      .from('invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('token', inviteToken)

  } else {
    // Create new firm
    const { data: firm } = await adminClient
      .from('firms')
      .insert({ name: firmName })
      .select()
      .single()

    if (!firm) return { error: 'Failed to create firm' }

    await adminClient.from('profiles').upsert({
      id: userId,
      firm_id: firm.id,
      full_name: fullName,
      email,
      role: 'admin',
    })

    // Seed default stages
    const defaultStages = [
      { firm_id: firm.id, name: 'New', position: 0, is_terminal: false },
      { firm_id: firm.id, name: 'Screening', position: 1, is_terminal: false },
      { firm_id: firm.id, name: 'Underwriting', position: 2, is_terminal: false },
      { firm_id: firm.id, name: 'LOI', position: 3, is_terminal: false },
      { firm_id: firm.id, name: 'Closed', position: 4, is_terminal: true },
      { firm_id: firm.id, name: 'Killed', position: 5, is_terminal: true },
    ]
    await adminClient.from('deal_stages').insert(defaultStages)

    // Seed default kill reasons
    const defaultKillReasons = [
      { firm_id: firm.id, name: 'Price Too High', position: 0 },
      { firm_id: firm.id, name: 'Market Concerns', position: 1 },
      { firm_id: firm.id, name: 'Due Diligence Issues', position: 2 },
      { firm_id: firm.id, name: 'Financing Fell Through', position: 3 },
      { firm_id: firm.id, name: 'Passed on Returns', position: 4 },
    ]
    await adminClient.from('kill_reasons').insert(defaultKillReasons)
  }

  redirect('/pipeline')
}
