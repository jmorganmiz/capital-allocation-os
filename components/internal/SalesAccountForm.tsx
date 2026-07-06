'use client'

import { useState } from 'react'
import { upsertSalesAccount } from '@/lib/internal/actions'

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(112,112,125,0.3)',
  color: '#f4f4f8',
}

export default function SalesAccountForm() {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    const form = new FormData(event.currentTarget)
    const result = await upsertSalesAccount({
      companyName: String(form.get('companyName') ?? ''),
      stage: String(form.get('stage') ?? 'prospect'),
      monthlyValue: String(form.get('monthlyValue') ?? ''),
      notes: String(form.get('notes') ?? ''),
    })
    setSaving(false)
    if (result?.error) setError(result.error)
    else setOpen(false)
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 rounded-md px-3 py-1.5 text-xs font-semibold" style={{ background: '#6366f1', color: '#fff' }}>
        + Add account
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 grid gap-3 rounded-lg border p-4 sm:grid-cols-4" style={{ borderColor: 'rgba(112,112,125,0.25)' }}>
      <input name="companyName" required placeholder="Company name" maxLength={200} className="rounded-md px-3 py-2 text-sm sm:col-span-2" style={inputStyle} />
      <select name="stage" className="rounded-md px-3 py-2 text-sm" style={inputStyle} defaultValue="prospect">
        {['prospect', 'demo', 'trial', 'paying', 'churned'].map((stage) => (
          <option key={stage} value={stage}>{stage}</option>
        ))}
      </select>
      <input name="monthlyValue" inputMode="numeric" placeholder="Monthly $" className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
      <input name="notes" placeholder="Notes" maxLength={2000} className="rounded-md px-3 py-2 text-sm sm:col-span-3" style={inputStyle} />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-50" style={{ background: '#6366f1', color: '#fff' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-xs" style={{ color: '#c3c3d0' }}>Cancel</button>
      </div>
      {error && <p className="text-xs sm:col-span-4" style={{ color: '#f87171' }}>{error}</p>}
    </form>
  )
}
