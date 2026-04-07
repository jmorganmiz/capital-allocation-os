'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function setupWorkspaceAction(prevState: any, formData: FormData) {
  const firmName = formData.get('firm_name') as string

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const adminClient = createAdminClient()

  // Check if profile already exists (shouldn't, but be safe)
  const { data: existing } = await adminClient
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (existing?.firm_id) {
    redirect('/pipeline')
  }

  // Create firm
  const { data: firm, error: firmError } = await adminClient
    .from('firms')
    .insert({ name: firmName })
    .select()
    .single()

  if (firmError || !firm) {
    return { error: firmError?.message ?? 'Failed to create workspace.' }
  }

  // Create profile
  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: user.id,
    firm_id: firm.id,
    full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Unknown',
    email: user.email ?? '',
    role: 'admin',
  })

  if (profileError) {
    return { error: profileError.message }
  }

  // Seed default deal stages
  const { data: seededStages } = await adminClient.from('deal_stages').insert([
    { firm_id: firm.id, name: 'New', position: 0, is_terminal: false },
    { firm_id: firm.id, name: 'Screening', position: 1, is_terminal: false },
    { firm_id: firm.id, name: 'Underwriting', position: 2, is_terminal: false },
    { firm_id: firm.id, name: 'LOI', position: 3, is_terminal: false },
    { firm_id: firm.id, name: 'Closed', position: 4, is_terminal: true },
    { firm_id: firm.id, name: 'Killed', position: 5, is_terminal: true },
  ]).select()

  if (seededStages) {
    const stageId = (name: string) => seededStages.find(s => s.name === name)?.id
    const checklistRows = [
      // Screening
      { firm_id: firm.id, stage_id: stageId('Screening'), name: 'Review offering memorandum', position: 0 },
      { firm_id: firm.id, stage_id: stageId('Screening'), name: 'Run comparable sales analysis', position: 1 },
      { firm_id: firm.id, stage_id: stageId('Screening'), name: 'Confirm market vacancy and rent data', position: 2 },
      { firm_id: firm.id, stage_id: stageId('Screening'), name: 'IC go / no-go decision', position: 3 },
      // Underwriting
      { firm_id: firm.id, stage_id: stageId('Underwriting'), name: 'Build full underwriting model', position: 0 },
      { firm_id: firm.id, stage_id: stageId('Underwriting'), name: 'Complete site visit', position: 1 },
      { firm_id: firm.id, stage_id: stageId('Underwriting'), name: 'Size debt and confirm lender terms', position: 2 },
      { firm_id: firm.id, stage_id: stageId('Underwriting'), name: 'IC approval to proceed', position: 3 },
      // LOI
      { firm_id: firm.id, stage_id: stageId('LOI'), name: 'Order Phase I environmental report', position: 0 },
      { firm_id: firm.id, stage_id: stageId('LOI'), name: 'Complete property condition assessment', position: 1 },
      { firm_id: firm.id, stage_id: stageId('LOI'), name: 'Verify rent rolls and lease abstracts', position: 2 },
      { firm_id: firm.id, stage_id: stageId('LOI'), name: 'Review title and survey', position: 3 },
      { firm_id: firm.id, stage_id: stageId('LOI'), name: 'Finalize loan commitment', position: 4 },
      { firm_id: firm.id, stage_id: stageId('LOI'), name: 'IC final approval', position: 5 },
    ].filter(r => r.stage_id)
    await adminClient.from('stage_checklist_items').insert(checklistRows)
  }

  // Seed default kill reasons
  await adminClient.from('kill_reasons').insert([
    { firm_id: firm.id, name: 'Price Too High', position: 0 },
    { firm_id: firm.id, name: 'Market Concerns', position: 1 },
    { firm_id: firm.id, name: 'Due Diligence Issues', position: 2 },
    { firm_id: firm.id, name: 'Financing Fell Through', position: 3 },
    { firm_id: firm.id, name: 'Passed on Returns', position: 4 },
  ])

  redirect('/pipeline')
}
