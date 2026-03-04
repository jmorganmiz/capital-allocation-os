'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDealStage(name: string, position: number) {
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Not authenticated' }

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
  const { error } = await supabase.from('deal_stages').update(updates).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function deleteDealStage(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('deal_stages').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function createKillReason(name: string, position: number) {
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Not authenticated' }

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
  const { error } = await supabase.from('kill_reasons').update(updates).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function deleteKillReason(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('kill_reasons').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}
