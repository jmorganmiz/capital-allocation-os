'use client'

import { useState } from 'react'
import { createInternalTask, updateInternalTaskStatus } from '@/lib/internal/actions'

type Task = {
  id: string
  title: string
  description: string | null
  status: string
  due_date: string | null
  assignee_id: string | null
  assignee: { full_name: string } | null
}

type Member = { id: string; full_name: string; role: string }

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(112,112,125,0.3)',
  color: '#f4f4f8',
}

const STATUS_COLORS: Record<string, { background: string; color: string }> = {
  open: { background: 'rgba(255,255,255,0.08)', color: '#c3c3d0' },
  in_progress: { background: 'rgba(99,102,241,0.18)', color: '#c7d2fe' },
  blocked: { background: 'rgba(248,113,113,0.15)', color: '#f87171' },
  done: { background: 'rgba(74,222,128,0.12)', color: '#4ade80' },
}

export default function TaskList({ tasks, members, canWrite, currentUserId }: {
  tasks: Task[]
  members: Member[]
  canWrite: boolean
  currentUserId: string
}) {
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    const form = new FormData(event.currentTarget)
    const result = await createInternalTask({
      title: String(form.get('title') ?? ''),
      description: String(form.get('description') ?? ''),
      assigneeId: String(form.get('assigneeId') ?? '') || null,
      dueDate: String(form.get('dueDate') ?? '') || null,
    })
    setSaving(false)
    if (result?.error) setError(result.error)
    else setAdding(false)
  }

  async function advance(task: Task, status: string) {
    setError('')
    const result = await updateInternalTaskStatus(task.id, status)
    if (result?.error) setError(result.error)
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold" style={{ color: '#f4f4f8' }}>Tasks</h2>
        {canWrite && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="rounded-md px-3 py-1.5 text-xs font-semibold" style={{ background: '#6366f1', color: '#fff' }}>
            + New task
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleCreate} className="mt-3 grid gap-3 rounded-lg border p-4 sm:grid-cols-4" style={{ borderColor: 'rgba(112,112,125,0.25)' }}>
          <input name="title" required placeholder="Task title" maxLength={200} className="rounded-md px-3 py-2 text-sm sm:col-span-2" style={inputStyle} />
          <select name="assigneeId" className="rounded-md px-3 py-2 text-sm" style={inputStyle} defaultValue={currentUserId}>
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>{member.full_name}</option>
            ))}
          </select>
          <input name="dueDate" type="date" className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
          <input name="description" placeholder="Details (optional)" maxLength={2000} className="rounded-md px-3 py-2 text-sm sm:col-span-3" style={inputStyle} />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-50" style={{ background: '#6366f1', color: '#fff' }}>
              {saving ? 'Saving…' : 'Create'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-md px-3 py-2 text-xs" style={{ color: '#c3c3d0' }}>Cancel</button>
          </div>
        </form>
      )}

      {error && <p className="mt-2 text-xs" style={{ color: '#f87171' }}>{error}</p>}

      <div className="mt-3 space-y-2">
        {tasks.length === 0 && <p className="text-sm" style={{ color: '#8b8b9a' }}>No tasks yet.</p>}
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 rounded-lg border px-4 py-3" style={{ borderColor: 'rgba(112,112,125,0.2)', background: 'rgba(255,255,255,0.02)' }}>
            <span className="rounded-full px-2 py-0.5 text-xs" style={STATUS_COLORS[task.status] ?? STATUS_COLORS.open}>
              {task.status.replaceAll('_', ' ')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm" style={{ color: task.status === 'done' ? '#8b8b9a' : '#f4f4f8', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                {task.title}
              </p>
              <p className="text-xs" style={{ color: '#8b8b9a' }}>
                {task.assignee?.full_name ?? 'Unassigned'}
                {task.due_date ? ` · due ${task.due_date}` : ''}
              </p>
            </div>
            {canWrite && task.status !== 'done' && (
              <div className="flex gap-1.5">
                {task.status !== 'in_progress' && (
                  <button type="button" onClick={() => advance(task, 'in_progress')} className="rounded-md px-2 py-1 text-xs" style={{ background: 'rgba(99,102,241,0.18)', color: '#c7d2fe' }}>Start</button>
                )}
                <button type="button" onClick={() => advance(task, 'done')} className="rounded-md px-2 py-1 text-xs" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>Done</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
