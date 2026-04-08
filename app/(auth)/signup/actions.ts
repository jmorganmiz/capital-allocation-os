'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUpAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const firmName = formData.get('firm_name') as string
  const inviteToken = formData.get('invite_token') as string | null

  console.log('[signup] attempting signup for:', email, 'invite:', !!inviteToken)

  const adminClient = createAdminClient()

  // Use admin to create user so email confirmation is bypassed
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (authError) {
    console.error('[signup] auth error:', authError.message)
    return { error: authError.message }
  }
  if (!authData.user) return { error: 'Signup failed — no user returned.' }

  const userId = authData.user.id
  console.log('[signup] user created:', userId)

  if (inviteToken) {
    const { data: invite } = await adminClient
      .from('invites')
      .select('firm_id')
      .eq('token', inviteToken)
      .is('accepted_at', null)
      .single()

    if (!invite) return { error: 'Invalid or expired invite link.' }

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: userId,
      firm_id: invite.firm_id,
      full_name: fullName,
      email,
      role: 'member',
    })
    if (profileError) {
      console.error('[signup] profile error:', profileError.message)
      return { error: profileError.message }
    }

    await adminClient
      .from('invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('token', inviteToken)

  } else {
    const { data: firm, error: firmError } = await adminClient
      .from('firms')
      .insert({ name: firmName })
      .select()
      .single()

    if (firmError || !firm) {
      console.error('[signup] firm error:', firmError?.message)
      return { error: firmError?.message ?? 'Failed to create firm' }
    }

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: userId,
      firm_id: firm.id,
      full_name: fullName,
      email,
      role: 'admin',
    })
    if (profileError) {
      console.error('[signup] profile error:', profileError.message)
      return { error: profileError.message }
    }

    const { data: seededStages } = await adminClient.from('deal_stages').insert([
      { firm_id: firm.id, name: 'New',           position: 0, is_terminal: false },
      { firm_id: firm.id, name: 'Screening',     position: 1, is_terminal: false },
      { firm_id: firm.id, name: 'LOI',           position: 2, is_terminal: false },
      { firm_id: firm.id, name: 'Due Diligence', position: 3, is_terminal: false },
      { firm_id: firm.id, name: 'Closed',        position: 4, is_terminal: true  },
      { firm_id: firm.id, name: 'Killed',        position: 5, is_terminal: true  },
    ]).select()

    if (seededStages) {
      const stageId = (name: string) => seededStages.find(s => s.name === name)?.id
      const checklistRows = [
        // Screening
        { firm_id: firm.id, stage_id: stageId('Screening'), name: 'Review offering memorandum', position: 0 },
        { firm_id: firm.id, stage_id: stageId('Screening'), name: 'Run comparable sales analysis', position: 1 },
        { firm_id: firm.id, stage_id: stageId('Screening'), name: 'Confirm market vacancy and rent data', position: 2 },
        { firm_id: firm.id, stage_id: stageId('Screening'), name: 'IC go / no-go decision', position: 3 },
        // LOI
        { firm_id: firm.id, stage_id: stageId('LOI'), name: 'Build full underwriting model', position: 0 },
        { firm_id: firm.id, stage_id: stageId('LOI'), name: 'Complete site visit', position: 1 },
        { firm_id: firm.id, stage_id: stageId('LOI'), name: 'Size debt and confirm lender terms', position: 2 },
        { firm_id: firm.id, stage_id: stageId('LOI'), name: 'IC approval to proceed', position: 3 },
        // Due Diligence
        { firm_id: firm.id, stage_id: stageId('Due Diligence'), name: 'Order Phase I environmental report', position: 0 },
        { firm_id: firm.id, stage_id: stageId('Due Diligence'), name: 'Complete property condition assessment', position: 1 },
        { firm_id: firm.id, stage_id: stageId('Due Diligence'), name: 'Verify rent rolls and lease abstracts', position: 2 },
        { firm_id: firm.id, stage_id: stageId('Due Diligence'), name: 'Review title and survey', position: 3 },
        { firm_id: firm.id, stage_id: stageId('Due Diligence'), name: 'Finalize loan commitment', position: 4 },
        { firm_id: firm.id, stage_id: stageId('Due Diligence'), name: 'IC final approval', position: 5 },
      ].filter(r => r.stage_id)
      await adminClient.from('stage_checklist_items').insert(checklistRows)
    }

    await adminClient.from('kill_reasons').insert([
      { firm_id: firm.id, name: 'Price Too High', position: 0 },
      { firm_id: firm.id, name: 'Market Concerns', position: 1 },
      { firm_id: firm.id, name: 'Due Diligence Issues', position: 2 },
      { firm_id: firm.id, name: 'Financing Fell Through', position: 3 },
      { firm_id: firm.id, name: 'Passed on Returns', position: 4 },
    ])
  }

  // Sign in with the new credentials to establish the session
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    console.error('[signup] sign in after signup failed:', signInError.message)
    return { error: `Account created but sign-in failed: ${signInError.message}` }
  }

  console.log('[signup] complete, redirecting to /pipeline')
  redirect('/pipeline')
}
