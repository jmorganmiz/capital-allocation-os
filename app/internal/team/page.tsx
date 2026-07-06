import { notFound } from 'next/navigation'
import { getInternalContext, can } from '@/lib/internal/auth'
import TaskList from '@/components/internal/TaskList'
import RosterManager from '@/components/internal/RosterManager'

export default async function InternalTeamPage() {
  const context = await getInternalContext()
  if (!context || !can(context, 'team')) notFound()

  const [{ data: tasks }, { data: members }, { data: activity }] = await Promise.all([
    context.supabase
      .from('tasks')
      .select('*, assignee:internal_users!tasks_assignee_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(100),
    context.supabase.from('internal_users').select('id, full_name, role').order('full_name'),
    context.supabase
      .from('activity_log')
      .select('*, actor:internal_users(full_name)')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#f4f4f8' }}>Team</h1>
        <p className="mt-1 text-sm" style={{ color: '#8b8b9a' }}>Tasks and the audit trail of internal actions.</p>
      </div>

      <TaskList
        tasks={(tasks ?? []) as never[]}
        members={(members ?? []) as never[]}
        canWrite={can(context, 'team', 'write')}
        currentUserId={context.userId}
      />

      {context.role === 'owner' && (
        <RosterManager members={(members ?? []) as never[]} currentUserId={context.userId} />
      )}

      <section>
        <h2 className="text-base font-semibold" style={{ color: '#f4f4f8' }}>Activity log</h2>
        <div className="mt-3 space-y-2">
          {(activity ?? []).length === 0 && <p className="text-sm" style={{ color: '#8b8b9a' }}>No activity recorded yet.</p>}
          {(activity ?? []).map((entry: any) => (
            <div key={entry.id} className="rounded-lg border px-4 py-2.5 text-sm" style={{ borderColor: 'rgba(112,112,125,0.2)', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ color: '#f4f4f8' }}>{entry.actor?.full_name ?? 'Unknown'}</span>
              <span style={{ color: '#8b8b9a' }}> · {entry.module} · {entry.action.replaceAll('_', ' ')}</span>
              <span className="float-right text-xs" style={{ color: '#8b8b9a' }}>
                {new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
