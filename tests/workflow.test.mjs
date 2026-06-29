import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateOverallScore, classifyAttention, getAccessState } from '../lib/workflow.mjs'

test('trial access is deterministic and active subscriptions override expiry', () => {
  const now = Date.parse('2026-06-28T12:00:00Z')
  assert.deepEqual(
    getAccessState({ trialEndsAt: '2026-07-03T12:00:00Z', subscriptionStatus: null, now }),
    { subscribed: false, trialActive: true, allowed: true, daysLeft: 5 },
  )
  assert.equal(getAccessState({ trialEndsAt: '2026-06-01T00:00:00Z', subscriptionStatus: null, now }).allowed, false)
  assert.equal(getAccessState({ trialEndsAt: null, subscriptionStatus: 'active', now }).allowed, true)
})

test('overall underwriting score maps the 1-5 scale to 0-100', () => {
  assert.equal(calculateOverallScore([]), null)
  assert.equal(calculateOverallScore([1, 1]), 0)
  assert.equal(calculateOverallScore([3, 3]), 50)
  assert.equal(calculateOverallScore([5, 5]), 100)
  assert.equal(calculateOverallScore([5, 'bad', 1]), 50)
})

test('attention classification separates intake review from stale pipeline work', () => {
  const now = Date.parse('2026-06-28T12:00:00Z')
  const deals = [
    { id: 'email', stage_id: 'new', intake_type: 'email', updated_at: '2026-06-28T10:00:00Z', deal_scores: [3] },
    { id: 'unscored', stage_id: 'new', intake_type: 'manual', updated_at: '2026-06-28T10:00:00Z', deal_scores: [] },
    { id: 'stale', stage_id: 'screening', intake_type: 'manual', updated_at: '2026-06-01T10:00:00Z', deal_scores: [4] },
    { id: 'current', stage_id: 'screening', intake_type: 'manual', updated_at: '2026-06-28T10:00:00Z', deal_scores: [4] },
  ]
  const result = classifyAttention(deals, 'new', now)
  assert.deepEqual(result.needsReview.map(deal => deal.id), ['email', 'unscored'])
  assert.deepEqual(result.staleDeals.map(deal => deal.id), ['stale'])
})
