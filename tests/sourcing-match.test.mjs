import assert from 'node:assert/strict'
import test from 'node:test'
import { matchAgainstBuyBoxes, normalizeKey } from '../lib/sourcing-match.mjs'

const box = (overrides = {}) => ({
  id: 'box-1',
  asset_type: 'Multifamily',
  preferred_markets: 'Richmond, Norfolk',
  max_asking_price: 5_000_000,
  ...overrides,
})

test('full match scores asset type, market, price ceiling, and completeness', () => {
  const result = matchAgainstBuyBoxes([box()], {
    assetType: 'Multifamily',
    market: 'Richmond, VA',
    askingPrice: 2_500_000,
    address: '42 Oak Street',
    unitCount: 12,
  })
  assert.equal(result.box?.id, 'box-1')
  assert.equal(result.score, 100)
  assert.deepEqual(result.reasons, [
    'Asset type matches buy box',
    'Preferred market',
    'Within price ceiling',
  ])
})

test('mismatches are reported without inflating the score', () => {
  const result = matchAgainstBuyBoxes([box()], {
    assetType: 'Multifamily',
    market: 'Phoenix, AZ',
    askingPrice: 9_000_000,
    address: '',
    unitCount: null,
  })
  assert.equal(result.score, 50)
  assert.ok(result.reasons.includes('Outside preferred markets'))
  assert.ok(result.reasons.includes('Above price ceiling'))
})

test('no matching buy box yields null score and an explanatory reason', () => {
  const result = matchAgainstBuyBoxes([box()], {
    assetType: 'Industrial',
    market: 'Richmond, VA',
    askingPrice: 1_000_000,
    address: '1 Dock Rd',
    unitCount: null,
  })
  assert.equal(result.box, null)
  assert.equal(result.score, null)
  assert.deepEqual(result.reasons, ['No matching buy box yet'])
})

test('normalizeKey strips punctuation and case for dedupe keys', () => {
  assert.equal(normalizeKey('42 Oak St., Richmond VA'), '42oakstrichmondva')
  assert.equal(normalizeKey(null), '')
})
