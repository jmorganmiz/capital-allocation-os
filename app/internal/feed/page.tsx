import { notFound } from 'next/navigation'
import { getInternalContext } from '@/lib/internal/auth'

const MODULE_COLORS: Record<string, { background: string; color: string }> = {
  ops: { background: 'rgba(99,102,241,0.15)', color: '#c7d2fe' },
  team: { background: 'rgba(74,222,128,0.12)', color: '#4ade80' },
  dev: { background: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
  marketing: { background: 'rgba(244,114,182,0.12)', color: '#f9a8d4' },
  ownership: { background: 'rgba(255,255,255,0.08)', color: '#c3c3d0' },
}

export default async function InternalFeedPage() {
  const context = await getInternalContext()
  if (!context) notFound()

  // RLS scopes rows to modules the caller's role can read, so the feed is
  // automatically role-filtered (e.g. employees never see ownership entries).
  const { data: entries } = await context.supabase
    .from('activity_log')
    .select('*, actor:internal_users(full_name)')
    .order('created_at', { ascending: false })
    .limit(150)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#f4f4f8' }}>Activity feed</h1>
        <p className="mt-1 text-sm" style={{ color: '#8b8b9a' }}>Everything the team has done, scoped to what your role can see.</p>
      </div>

      <div className="space-y-2">
        {(entries ?? []).length === 0 && <p className="text-sm" style={{ color: '#8b8b9a' }}>No activity yet.</p>}
        {(entries ?? []).map((entry: any) => (
          <div key={entry.id} className="flex items-center gap-3 rounded-lg border px-4 py-2.5" style={{ borderColor: 'rgba(112,112,125,0.2)', background: 'rgba(255,255,255,0.02)' }}>
            <span className="rounded-full px-2 py-0.5 text-xs" style={MODULE_COLORS[entry.module] ?? MODULE_COLORS.ownership}>{entry.module}</span>
            <p className="min-w-0 flex-1 truncate text-sm" style={{ color: '#f4f4f8' }}>
              <span className="font-medium">{entry.actor?.full_name ?? 'Unknown'}</span>
              <span style={{ color: '#c3c3d0' }}> · {entry.action.replaceAll('_', ' ')}</span>
              {entry.detail && typeof entry.detail === 'object' && 'title' in entry.detail && (
                <span style={{ color: '#8b8b9a' }}> — {String(entry.detail.title)}</span>
              )}
              {entry.detail && typeof entry.detail === 'object' && 'name' in entry.detail && (
                <span style={{ color: '#8b8b9a' }}> — {String(entry.detail.name)}</span>
              )}
            </p>
            <p className="text-xs" style={{ color: '#8b8b9a' }}>
              {new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
