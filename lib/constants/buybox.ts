export const ASSET_TYPES = [
  'Multifamily',
  'Retail',
  'Industrial',
  'Office',
  'Net Lease',
  'Mixed Use',
] as const

export type AssetType = typeof ASSET_TYPES[number]

export type BuyBoxCriterion = {
  id: string
  buy_box_id: string
  name: string
  description: string | null
  position: number
}

export type BuyBox = {
  id: string
  name: string
  asset_type: string
  min_cap_rate: number | null
  max_asking_price: number | null
  min_noi: number | null
  preferred_markets: string | null
  preferred_deal_structure: string | null
  notes: string | null
  updated_at: string
}

export type BuyBoxWithCriteria = BuyBox & {
  buy_box_criteria: BuyBoxCriterion[]
}
