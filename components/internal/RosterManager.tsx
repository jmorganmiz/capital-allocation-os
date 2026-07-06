'use client'

import { useState } from 'react'
import { addInternalUser, removeInternalUser } from '@/lib/internal/actions'

type Member = { id: string; full_name: string; role: string }

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(112,112,125,0.3)',
  color: '#f4f4f8',
}

export default function RosterManager({ members, currentUserId }: { members: Member[]; currentUserId: string }) {
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const result = await addInternalUser({
      email: String(form.get('email') ?? ''),
      fullName: String(form.get('fullName') ?? ''),
      role: String(form.get('role') ?? 'employee'),
    })
    if (result?.error) setError(result.error)
    else setAdding(false)
  }

  async function handleRemove(member: Member) {
    setError('')
    const result = await removeInternalUser(member.id)
    if (result?.error) setError(result.error)
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold" style={{ color: '#f4f4f8' }}>Internal roster</h2>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="rounded-md px-3 py-1.5 text-xs font-semibold" style={{ background: '#6366f1', color: '#fff' }}>+ Add member</button>
        )}
      </div>
      <p className="mt-1 text-xs" style={{ color: '#8b8b9a' }}>
        They need a Dealstash login first; then add them here by the email they signed up with.
      </p>

      {adding && (
        <form onSubmit={handleAdd} className="mt-3 grid gap-3 rounded-lg border p-4 sm:grid-cols-4" style={{ borderColor: 'rgba(112,112,125,0.25)' }}>
          <input name="email" type="email" required placeholder="their@email.com" maxLength={200} className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
          <input name="fullName" required placeholder="Full name" maxLength={120} className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
          <select name="role" defaultValue="employee" className="rounded-md px-3 py-2 text-sm" style={inputStyle}>
            {['engineer', 'finance', 'employee', 'owner'].map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="rounded-md px-3 py-2 text-xs font-semibold" style={{ background: '#6366f1', color: '#fff' }}>Add</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-md px-3 py-2 text-xs" style={{ color: '#c3c3d0' }}>Cancel</button>
          </div>
        </form>
      )}

      {error && <p className="mt-2 text-xs" style={{ color: '#f87171' }}>{error}</p>}

      <div className="mt-3 space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-lg border px-4 py-2.5" style={{ borderColor: 'rgba(112,112,125,0.2)', background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-sm" style={{ color: '#f4f4f8' }}>
              {member.full_name}
              <span className="ml-2 rounded-full px-2 py-0.5 text-xs" style={{ background: 'rgba(99,102,241,0.15)', color: '#c7d2fe' }}>{member.role}</span>
            </p>
            {member.id !== currentUserId && (
              <button type="button" onClick={() => handleRemove(member)} className="rounded-md px-2 py-1 text-xs" style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>Remove</button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
