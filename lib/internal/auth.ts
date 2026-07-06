import 'server-only'
import { createClient } from '@/lib/supabase/server'

export type InternalRole = 'owner' | 'engineer' | 'finance' | 'employee'
export type AccessLevel = 'none' | 'read' | 'write' | 'full'
export type InternalModule = 'ops' | 'team' | 'dev' | 'secrets' | 'marketing' | 'ownership'

export type InternalContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  fullName: string
  role: InternalRole
  permissions: Record<string, AccessLevel>
}

// Resolves the caller to an internal team member, or null for everyone else
// (customers, logged-out). The /internal layout treats null as not-found so the
// panel does not advertise its existence.
export async function getInternalContext(): Promise<InternalContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: internalUser } = await supabase
    .from('internal_users')
    .select('id, full_name, role')
    .eq('id', user.id)
    .maybeSingle()
  if (!internalUser) return null

  const { data: rows } = await supabase
    .from('role_permissions')
    .select('module, access_level')
    .eq('role', internalUser.role)

  const permissions: Record<string, AccessLevel> = {}
  for (const row of rows ?? []) permissions[row.module] = row.access_level as AccessLevel

  return {
    supabase,
    userId: user.id,
    fullName: internalUser.full_name,
    role: internalUser.role as InternalRole,
    permissions,
  }
}

export function can(context: InternalContext, module: InternalModule, level: 'read' | 'write' | 'full' = 'read') {
  const access = context.permissions[module] ?? 'none'
  if (level === 'read') return access !== 'none'
  if (level === 'write') return access === 'write' || access === 'full'
  return access === 'full'
}

// Append-only audit trail; every internal write action calls this.
export async function logActivity(
  context: InternalContext,
  module: InternalModule,
  action: string,
  detail?: Record<string, unknown>,
) {
  const { error } = await context.supabase.from('activity_log').insert({
    actor_id: context.userId,
    module,
    action,
    detail: detail ?? null,
  })
  if (error) console.error('[internal] activity log write failed:', error.code)
}
