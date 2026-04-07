'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Settings: manage checklist items per stage ────────────────────────────────

export async function createChecklistItem(stageId: string, name: string, position: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data, error } = await supabase
    .from('stage_checklist_items')
    .insert({ firm_id: profile.firm_id, stage_id: stageId, name, position })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { item: data }
}

export async function updateChecklistItem(id: string, updates: { name?: string; position?: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('stage_checklist_items')
    .update(updates)
    .eq('id', id)
    .eq('firm_id', profile.firm_id)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function deleteChecklistItem(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('stage_checklist_items')
    .delete()
    .eq('id', id)
    .eq('firm_id', profile.firm_id)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

// Batch-update positions after a reorder
export async function reorderChecklistItems(items: { id: string; position: number }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  for (const { id, position } of items) {
    await supabase
      .from('stage_checklist_items')
      .update({ position })
      .eq('id', id)
      .eq('firm_id', profile.firm_id)
  }

  revalidatePath('/settings')
  return { success: true }
}

// ── Deal workspace: toggle an item complete/incomplete ────────────────────────

export async function toggleChecklistItem(
  dealId: string,
  itemId: string,
  completed: boolean,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  if (completed) {
    const { error } = await supabase
      .from('deal_checklist_progress')
      .upsert(
        {
          deal_id: dealId,
          checklist_item_id: itemId,
          firm_id: profile.firm_id,
          completed_by: user.id,
        },
        { onConflict: 'deal_id,checklist_item_id' },
      )
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('deal_checklist_progress')
      .delete()
      .eq('deal_id', dealId)
      .eq('checklist_item_id', itemId)
    if (error) return { error: error.message }
  }

  revalidatePath(`/deals/${dealId}`)
  return { success: true }
}
