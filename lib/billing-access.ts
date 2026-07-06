import type { SupabaseClient } from '@supabase/supabase-js'
import { getAccessState } from '@/lib/workflow.mjs'

export const SUBSCRIPTION_REQUIRED_ERROR =
  'Your trial has ended. An administrator can restore access from Settings.'

// Server-side counterpart of the AccessGate paywall: mutations and AI routes
// call this after resolving the caller's firm. Reads stay open so lapsed
// firms can still see their data and reach Settings to resubscribe.
export async function assertFirmAccess(
  supabase: SupabaseClient,
  firmId: string,
): Promise<string | null> {
  const { data: firm, error } = await supabase
    .from('firms')
    .select('trial_ends_at, stripe_subscription_status')
    .eq('id', firmId)
    .maybeSingle()

  if (error || !firm) return 'Could not verify workspace billing status.'

  const access = getAccessState({
    trialEndsAt: firm.trial_ends_at,
    subscriptionStatus: firm.stripe_subscription_status,
  })
  return access.allowed ? null : SUBSCRIPTION_REQUIRED_ERROR
}
