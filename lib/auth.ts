import { createClient } from '@/lib/supabase/server'

export async function getFirmContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not authenticated', status: 401 }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('firm_id, role')
    .eq('id', user.id)
    .single()

  if (error || !profile?.firm_id) {
    return { ok: false as const, error: 'Profile not found', status: 403 }
  }
  return { ok: true as const, supabase, user, profile }
}

export async function requireFirmAdmin() {
  const context = await getFirmContext()
  if (!context.ok) return context
  if (context.profile.role !== 'admin') {
    return { ok: false as const, error: 'Administrator access required', status: 403 }
  }
  return context
}
