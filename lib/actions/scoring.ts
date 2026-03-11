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

export async function getAllScoringCriteria() {
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

export async function getDealScores(dealId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('deal_scores')
    .select('*')
    .eq('deal_id', dealId)

  if (error) return { error: error.message }
  return { scores: data ?? [] }
}

export async function upsertDealScore(
  dealId: string,
  criteriaId: string,
  score: number,
  notes: string | null
) {
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

export async function getOverallScore(dealId: string): Promise<{ score: number | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { score: null, error: 'Not authenticated' }

  const { data: scores, error } = await supabase
    .from('deal_scores')
    .select('score')
    .eq('deal_id', dealId)

  if (error) return { score: null, error: error.message }
  if (!scores || scores.length === 0) return { score: null }

  const avg = scores.reduce((sum: number, s: any) => sum + (s.score ?? 0), 0) / scores.length
  // Convert 1-5 scale to 0-100
  const pct = Math.round(((avg - 1) / 4) * 100)
  return { score: pct }
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

  const { error } = await supabase
    .from('scoring_criteria')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function deleteScoringCriteria(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('scoring_criteria')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}
