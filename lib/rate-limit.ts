import type { SupabaseClient } from '@supabase/supabase-js'

export async function checkAiRateLimit(
  supabase: SupabaseClient,
  userId: string,
  route: string,
  limit = 10,
) {
  const since = new Date(Date.now() - 60_000).toISOString()
  const { count, error } = await supabase
    .from('ai_request_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('route', route)
    .gte('created_at', since)

  if (error) return { allowed: false, error: 'Rate limiter unavailable' }
  if ((count ?? 0) >= limit) return { allowed: false, error: 'Too many requests' }

  const { error: insertError } = await supabase
    .from('ai_request_log')
    .insert({ user_id: userId, route })

  return insertError
    ? { allowed: false, error: 'Rate limiter unavailable' }
    : { allowed: true }
}
