export function getAccessState(input: {
  trialEndsAt: string | null
  subscriptionStatus: string | null
  now?: number
}): { subscribed: boolean; trialActive: boolean; allowed: boolean; daysLeft: number }

export function calculateOverallScore(scores: unknown[]): number | null

export function classifyAttention<T extends {
  stage_id: string | null
  intake_type: string | null
  updated_at: string
  deal_scores?: unknown[]
}>(deals: T[], firstStageId: string | undefined, now?: number): {
  needsReview: T[]
  staleDeals: T[]
}
