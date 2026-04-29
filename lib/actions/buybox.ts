'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type BuyBoxWithCriteria } from '@/lib/constants/buybox'

type CriterionInput = { name: string; description: string }

type BuyBoxInput = {
  name: string
  asset_type: string
  min_cap_rate: number | null
  max_asking_price: number | null
  min_noi: number | null
  preferred_markets: string | null
  preferred_deal_structure: string | null
  notes: string | null
  criteria: CriterionInput[]
}

export async function getBuyBoxes(): Promise<{ buyBoxes?: BuyBoxWithCriteria[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data, error } = await supabase
    .from('buy_boxes')
    .select('*, buy_box_criteria(*)')
    .eq('firm_id', profile.firm_id)
    .order('updated_at', { ascending: false })

  if (error) return { error: error.message }
  return { buyBoxes: (data ?? []) as unknown as BuyBoxWithCriteria[] }
}

export async function createBuyBox(input: BuyBoxInput): Promise<{ buyBox?: BuyBoxWithCriteria; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { criteria, ...fields } = input

  const { data: box, error: boxErr } = await supabase
    .from('buy_boxes')
    .insert({ ...fields, firm_id: profile.firm_id })
    .select()
    .single()

  if (boxErr || !box) return { error: boxErr?.message ?? 'Failed to create buy box' }

  if (criteria.length > 0) {
    const rows = criteria.map((c, i) => ({
      buy_box_id:  box.id,
      firm_id:     profile.firm_id,
      name:        c.name,
      description: c.description || null,
      position:    i,
    }))
    const { error: criErr } = await supabase.from('buy_box_criteria').insert(rows)
    if (criErr) console.error('[createBuyBox] criteria insert failed:', criErr.message)
  }

  const { data: full } = await supabase
    .from('buy_boxes')
    .select('*, buy_box_criteria(*)')
    .eq('id', box.id)
    .single()

  revalidatePath('/buy-box')
  return { buyBox: full as unknown as BuyBoxWithCriteria }
}

export async function updateBuyBox(
  id: string,
  input: BuyBoxInput,
): Promise<{ buyBox?: BuyBoxWithCriteria; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { criteria, ...fields } = input

  const { error: boxErr } = await supabase
    .from('buy_boxes')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('firm_id', profile.firm_id)

  if (boxErr) return { error: boxErr.message }

  // Replace all criteria: delete existing then re-insert
  await supabase.from('buy_box_criteria').delete().eq('buy_box_id', id)

  if (criteria.length > 0) {
    const rows = criteria.map((c, i) => ({
      buy_box_id:  id,
      firm_id:     profile.firm_id,
      name:        c.name,
      description: c.description || null,
      position:    i,
    }))
    const { error: criErr } = await supabase.from('buy_box_criteria').insert(rows)
    if (criErr) console.error('[updateBuyBox] criteria insert failed:', criErr.message)
  }

  const { data: full } = await supabase
    .from('buy_boxes')
    .select('*, buy_box_criteria(*)')
    .eq('id', id)
    .single()

  revalidatePath('/buy-box')
  return { buyBox: full as unknown as BuyBoxWithCriteria }
}

export async function deleteBuyBox(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('buy_boxes')
    .delete()
    .eq('id', id)
    .eq('firm_id', profile.firm_id)

  if (error) return { error: error.message }

  revalidatePath('/buy-box')
  return {}
}
