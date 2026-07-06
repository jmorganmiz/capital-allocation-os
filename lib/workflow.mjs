const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

export function getAccessState({ trialEndsAt, subscriptionStatus, now = Date.now() }) {
  const subscribed = !!subscriptionStatus && ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus)
  const trialEnd = trialEndsAt ? new Date(trialEndsAt).getTime() : 0
  const remainingMs = trialEnd - now
  const trialActive = remainingMs > 0
  return {
    subscribed,
    trialActive,
    allowed: subscribed || trialActive,
    daysLeft: trialActive ? Math.max(1, Math.ceil(remainingMs / 86_400_000)) : 0,
  }
}

export function calculateOverallScore(scores) {
  const valid = scores.map(Number).filter(score => Number.isFinite(score) && score >= 1 && score <= 5)
  if (valid.length === 0) return null
  const average = valid.reduce((sum, score) => sum + score, 0) / valid.length
  return Math.round(((average - 1) / 4) * 100)
}

export function classifyAttention(deals, firstStageId, now = Date.now()) {
  const staleCutoff = now - 7 * 24 * 60 * 60 * 1000
  return {
    needsReview: deals.filter(deal =>
      deal.stage_id === firstStageId &&
      (deal.intake_type === 'email' || (deal.deal_scores ?? []).length === 0)
    ),
    staleDeals: deals.filter(deal =>
      deal.stage_id !== firstStageId &&
      new Date(deal.updated_at).getTime() < staleCutoff
    ),
  }
}
