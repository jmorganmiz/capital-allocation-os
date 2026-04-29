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
