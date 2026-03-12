'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const DEFAULT_CRITERIA = [
  'Location Grade',
  'Tenant Quality',
  'Lease Term Remaining',
  'Debt Coverage Ratio',
  'Cap Rate vs Threshold',
  'Market Demand',
  'Physical Condition',
  'Exit Strategy Clarity',
]

async function seedDefaultCriteria(firmId: string, supabase: any) {
  const rows = DEFAULT_CRITERIA.map((name, i) => ({
    firm_id: firmId,
    name,
    position: i,
    is_active: true,
  }))
  await supabase.from('scoring_criteria').insert(rows)
}

export async function getScoringCriteria() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data, error } = await supabase
    .from('scoring_criteria')
    .select('*')
    .eq('firm_id', profile.firm_id)
    .order('position')

  if (error) return { error: error.message }

  // Auto-seed if empty
  if ((data ?? []).length === 0) {
    await seedDefaultCriteria(profile.firm_id, supabase)
    const { data: seeded } = await supabase
      .from('scoring_criteria')
      .select('*')
      .eq('firm_id', profile.firm_id)
      .order('position')
    return { criteria: seeded ?? [] }
  }

  return { criteria: data ?? [] }
}

// Alias used by settings page — same as getScoringCriteria
export const getAllScoringCriteria = getScoringCriteria

export async function getDealScores(dealId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data, error } = await supabase
    .from('deal_scores')
    .select('*')
    .eq('deal_id', dealId)
    .eq('firm_id', profile.firm_id)

  if (error) return { error: error.message }
  return { scores: data ?? [] }
}

export async function upsertDealScore(
  dealId: string,
  criteriaId: string,
  score: number,
  notes: string | null
) {
  if (score < 1 || score > 5 || !Number.isInteger(score)) {
    return { error: 'Score must be an integer between 1 and 5' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data: existing } = await supabase
    .from('deal_scores')
    .select('id')
    .eq('deal_id', dealId)
    .eq('criteria_id', criteriaId)
    .eq('firm_id', profile.firm_id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('deal_scores')
      .update({ score, notes: notes ?? null, scored_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('deal_scores')
      .insert({
        deal_id:     dealId,
        criteria_id: criteriaId,
        firm_id:     profile.firm_id,
        score,
        notes:       notes ?? null,
        scored_by:   user.id,
      })
    if (error) return { error: error.message }
  }

  revalidatePath(`/deals/${dealId}`)
  return { success: true }
}

export async function createScoringCriteria(name: string, position: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data, error } = await supabase
    .from('scoring_criteria')
    .insert({ firm_id: profile.firm_id, name, position, is_active: true })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { criteria: data }
}

export async function updateScoringCriteria(id: string, updates: { name?: string; is_active?: boolean; position?: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('scoring_criteria')
    .update(updates)
    .eq('id', id)
    .eq('firm_id', profile.firm_id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function deleteScoringCriteria(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('scoring_criteria')
    .delete()
    .eq('id', id)
    .eq('firm_id', profile.firm_id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}
