// Buy-box matching shared by the in-app sourcing capture action and the
// public broker submission portal. Pure module so it stays testable.

export function normalizeKey(value) {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function matchAgainstBuyBoxes(boxes, input) {
  const box = boxes.find((item) => normalizeKey(item.asset_type) === normalizeKey(input.assetType)) ?? null
  const reasons = []
  let score = null

  if (box) {
    score = 20
    if (normalizeKey(box.asset_type) === normalizeKey(input.assetType)) { score += 30; reasons.push('Asset type matches buy box') }
    const markets = String(box.preferred_markets ?? '').split(',').map(normalizeKey).filter(Boolean)
    if (!markets.length) { score += 15; reasons.push('No market restriction') }
    else if (markets.some((item) => normalizeKey(input.market).includes(item) || item.includes(normalizeKey(input.market)))) { score += 25; reasons.push('Preferred market') }
    else reasons.push('Outside preferred markets')
    if (box.max_asking_price == null) { score += 15; reasons.push('No price ceiling') }
    else if (input.askingPrice != null && input.askingPrice <= Number(box.max_asking_price)) { score += 25; reasons.push('Within price ceiling') }
    else if (input.askingPrice != null) reasons.push('Above price ceiling')
    if (input.address && input.unitCount != null) score += 10
    score = Math.min(100, score)
  } else {
    reasons.push('No matching buy box yet')
  }

  return { box, score, reasons }
}
