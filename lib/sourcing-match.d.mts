export function normalizeKey(value: string | null | undefined): string

export type BuyBoxRecord = {
  id: string
  asset_type: string | null
  preferred_markets: string | null
  max_asking_price: number | string | null
}

export function matchAgainstBuyBoxes(
  boxes: BuyBoxRecord[],
  input: { assetType: string; market: string; askingPrice: number | null; address: string; unitCount: number | null },
): { box: BuyBoxRecord | null; score: number | null; reasons: string[] }
