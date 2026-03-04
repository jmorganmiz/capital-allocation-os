'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const DEFAULT_STAGES = [
  { name: 'New',          position: 0, is_terminal: false },
  { name: 'Screening',    position: 1, is_terminal: false },
  { name: 'Underwriting', position: 2, is_terminal: false },
  { name: 'LOI',          position: 3, is_terminal: false },
  { name: 'Closed',       position: 4, is_terminal: true  },
  { name: 'Killed',       position: 5, is_terminal: true  },
]

const DEFAULT_KILL_REASONS = [
  { name: 'Pricing / Return Threshold Not Met', position: 0 },
  { name: 'Market / Location Concerns',          position: 1 },
  { name: 'Sponsor / Operator Quality',          position: 2 },
  { name: 'Deal Structure / Terms',              position: 3 },
  { name: 'Passed — Capacity',                  position: 4 },
  { name: 'Other',                               position: 5 },
]

export async function signUpAction(formData: FormData) {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const firmName = formData.get('firm_name') as string

  if (!email || !password || !firmName) {
    return { error: 'Email, password, and firm name are required.' }
  }

  const admin = createAdminClient()

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) return { error: authError.message }
  const userId = authData.user.id

  const { data: firm, error: firmError } = await admin
    .from('firms')
    .insert({ name: firmName })
    .select()
    .single()
  if (firmError) return { error: firmError.message }

  const { error: profileError } = await admin
    .from('profiles')
    .insert({ id: userId, firm_id: firm.id, full_name: fullName, role: 'partner' })
  if (profileError) return { error: profileError.message }

  const { error: stagesError } = await admin
    .from('deal_stages')
    .insert(DEFAULT_STAGES.map(s => ({ ...s, firm_id: firm.id })))
  if (stagesError) return { error: stagesError.message }

  const { error: killError } = await admin
    .from('kill_reasons')
    .insert(DEFAULT_KILL_REASONS.map(r => ({ ...r, firm_id: firm.id })))
  if (killError) return { error: killError.message }

  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) return { error: signInError.message }

  redirect('/pipeline')
}
