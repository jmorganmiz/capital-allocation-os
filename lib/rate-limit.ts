import type { SupabaseClient } from '@supabase/supabase-js'

export async function checkAiRateLimit(
  supabase: SupabaseClient,
  route: string,
  limit = 10,
) {
  const { data, error } = await supabase.rpc('consume_ai_rate_limit', {
    p_route: route,
    p_limit: limit,
    p_window_seconds: 60,
  })

  if (error) return { allowed: false, error: 'Rate limiter unavailable' }
  return data
    ? { allowed: true }
    : { allowed: false, error: 'Too many requests' }
}
