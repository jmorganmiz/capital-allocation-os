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
  await adminClient.from('deal_stages').insert([
    { firm_id: firm.id, name: 'New', position: 0, is_terminal: false },
    { firm_id: firm.id, name: 'Screening', position: 1, is_terminal: false },
    { firm_id: firm.id, name: 'Underwriting', position: 2, is_terminal: false },
    { firm_id: firm.id, name: 'LOI', position: 3, is_terminal: false },
    { firm_id: firm.id, name: 'Closed', position: 4, is_terminal: true },
    { firm_id: firm.id, name: 'Killed', position: 5, is_terminal: true },
  ])

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
