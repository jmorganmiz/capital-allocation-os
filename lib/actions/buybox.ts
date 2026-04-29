'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type BuyBox = {
  id: string
  asset_type: string
  min_cap_rate: number | null
  max_ltv: number | null
  min_dscr: number | null
  min_occupancy: number | null
  min_irr: number | null
  max_asking_price: number | null
  preferred_markets: string | null
  notes: string | null
  updated_at: string
}

export const ASSET_TYPES = [
  'Multifamily',
  'Retail',
  'Office',
  'Industrial',
  'Hospitality',
  'Self Storage',
  'Mixed Use',
  'Land',
  'Other',
] as const

type DefaultBox = Omit<BuyBox, 'id' | 'updated_at'>

const DEFAULTS: DefaultBox[] = [
  {
    asset_type: 'Multifamily',
    min_cap_rate: 0.055,
    max_ltv: 0.75,
    min_dscr: 1.25,
    min_occupancy: 0.85,
    min_irr: 0.12,
    max_asking_price: null,
    preferred_markets: null,
    notes: 'Value-add or stabilized. B/B+ class preferred. 50–300 units.',
  },
  {
    asset_type: 'Retail',
    min_cap_rate: 0.065,
    max_ltv: 0.70,
    min_dscr: 1.30,
    min_occupancy: 0.90,
    min_irr: 0.14,
    max_asking_price: null,
    preferred_markets: null,
    notes: 'Anchored or shadow-anchored. Essential retail preferred. Minimum 5-year WALT.',
  },
  {
    asset_type: 'Office',
    min_cap_rate: 0.07,
    max_ltv: 0.65,
    min_dscr: 1.35,
    min_occupancy: 0.85,
    min_irr: 0.15,
    max_asking_price: null,
    preferred_markets: null,
    notes: 'Suburban or medical office preferred. Class A/B. Minimum 5-year leases.',
  },
  {
    asset_type: 'Industrial',
    min_cap_rate: 0.05,
    max_ltv: 0.70,
    min_dscr: 1.25,
    min_occupancy: null,
    min_irr: 0.12,
    max_asking_price: null,
    preferred_markets: null,
    notes: 'Last-mile, distribution, or flex industrial. NNN leases preferred.',
  },
  {
    asset_type: 'Hospitality',
    min_cap_rate: 0.08,
    max_ltv: 0.60,
    min_dscr: 1.40,
    min_occupancy: 0.65,
    min_irr: 0.18,
    max_asking_price: null,
    preferred_markets: null,
    notes: 'Select-service or limited-service. Franchise flags only. Strong RevPAR market.',
  },
  {
    asset_type: 'Self Storage',
    min_cap_rate: 0.06,
    max_ltv: 0.70,
    min_dscr: 1.25,
    min_occupancy: 0.80,
    min_irr: 0.13,
    max_asking_price: null,
    preferred_markets: null,
    notes: 'Climate-controlled preferred. Suburban markets with limited new supply.',
  },
  {
    asset_type: 'Mixed Use',
    min_cap_rate: 0.06,
    max_ltv: 0.70,
    min_dscr: 1.25,
    min_occupancy: 0.85,
    min_irr: 0.13,
    max_asking_price: null,
    preferred_markets: null,
    notes: 'Retail ground floor with residential or office above. Urban infill preferred.',
  },
  {
    asset_type: 'Land',
    min_cap_rate: null,
    max_ltv: 0.50,
    min_dscr: null,
    min_occupancy: null,
    min_irr: 0.20,
    max_asking_price: null,
    preferred_markets: null,
    notes: 'Entitled or entitleable. Shovel-ready preferred. Exit via development or sale to builder.',
  },
  {
    asset_type: 'Other',
    min_cap_rate: null,
    max_ltv: null,
    min_dscr: null,
    min_occupancy: null,
    min_irr: null,
    max_asking_price: null,
    preferred_markets: null,
    notes: 'Evaluate on a case-by-case basis against deal fundamentals.',
  },
]

async function seedDefaults(firmId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const rows = DEFAULTS.map(d => ({ ...d, firm_id: firmId }))
  await supabase.from('buy_boxes').insert(rows)
}

export async function getBuyBoxes(): Promise<{ buyBoxes?: BuyBox[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data, error } = await supabase
    .from('buy_boxes')
    .select('*')
    .eq('firm_id', profile.firm_id)
    .order('asset_type')

  if (error) return { error: error.message }

  if (!data || data.length === 0) {
    await seedDefaults(profile.firm_id, supabase)
    const { data: seeded } = await supabase
      .from('buy_boxes')
      .select('*')
      .eq('firm_id', profile.firm_id)
      .order('asset_type')
    return { buyBoxes: (seeded ?? []) as BuyBox[] }
  }

  // Ensure all asset types are present (firm may predate a new type)
  const existingTypes = new Set(data.map((b: any) => b.asset_type))
  const missing = DEFAULTS.filter(d => !existingTypes.has(d.asset_type))
  if (missing.length > 0) {
    await supabase.from('buy_boxes').insert(missing.map(d => ({ ...d, firm_id: profile.firm_id })))
    const { data: full } = await supabase
      .from('buy_boxes')
      .select('*')
      .eq('firm_id', profile.firm_id)
      .order('asset_type')
    return { buyBoxes: (full ?? []) as BuyBox[] }
  }

  return { buyBoxes: data as BuyBox[] }
}

export async function upsertBuyBox(
  assetType: string,
  fields: Partial<Omit<BuyBox, 'id' | 'asset_type' | 'updated_at'>>,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('buy_boxes')
    .upsert(
      { firm_id: profile.firm_id, asset_type: assetType, ...fields, updated_at: new Date().toISOString() },
      { onConflict: 'firm_id,asset_type' },
    )

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return {}
}
