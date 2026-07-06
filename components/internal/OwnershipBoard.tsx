'use client'

import { useState } from 'react'
import { upsertEquityHolder, addDecision } from '@/lib/internal/actions'

type EquityRow = { id: string; holder_name: string; percentage: number | null; notes: string | null; updated_at: string }
type Decision = { id: string; title: string; summary: string; created_at: string; decided: { full_name: string } | null }

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(112,112,125,0.3)',
  color: '#f4f4f8',
}

export default function OwnershipBoard({ equity, decisions, canEditEquity, canLogDecisions }: {
  equity: EquityRow[]
  decisions: Decision[]
  canEditEquity: boolean
  canLogDecisions: boolean
}) {
  const [addingHolder, setAddingHolder] = useState(false)
  const [addingDecision, setAddingDecision] = useState(false)
  const [error, setError] = useState('')

  const totalPct = equity.reduce((sum, row) => sum + (Number(row.percentage) || 0), 0)

  async function handleHolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const result = await upsertEquityHolder({
      holderName: String(form.get('holderName') ?? ''),
      percentage: String(form.get('percentage') ?? ''),
      notes: String(form.get('notes') ?? ''),
    })
    if (result?.error) setError(result.error)
    else setAddingHolder(false)
  }

  async function handleDecision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const result = await addDecision({
      title: String(form.get('title') ?? ''),
      summary: String(form.get('summary') ?? ''),
    })
    if (result?.error) setError(result.error)
    else setAddingDecision(false)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#f4f4f8' }}>Ownership</h1>
        <p className="mt-1 text-sm" style={{ color: '#8b8b9a' }}>Equity reference and the decision log.</p>
      </div>

      <div className="rounded-lg border px-4 py-3 text-xs" style={{ borderColor: 'rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.08)', color: '#fbbf24' }}>
        Informational reference only — this is not a legal cap table and does not substitute for signed equity documentation.
      </div>

      {error && <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: '#f4f4f8' }}>Equity reference</h2>
          {canEditEquity && !addingHolder && (
            <button type="button" onClick={() => setAddingHolder(true)} className="rounded-md px-3 py-1.5 text-xs font-semibold" style={{ background: '#6366f1', color: '#fff' }}>+ Holder</button>
          )}
        </div>
        {addingHolder && (
          <form onSubmit={handleHolder} className="mt-3 grid gap-3 rounded-lg border p-4 sm:grid-cols-4" style={{ borderColor: 'rgba(112,112,125,0.25)' }}>
            <input name="holderName" required placeholder="Holder name" maxLength={160} className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
            <input name="percentage" inputMode="decimal" placeholder="%" className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
            <input name="notes" placeholder="Notes (vesting, class…)" maxLength={2000} className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
            <div className="flex gap-2">
              <button type="submit" className="rounded-md px-3 py-2 text-xs font-semibold" style={{ background: '#6366f1', color: '#fff' }}>Save</button>
              <button type="button" onClick={() => setAddingHolder(false)} className="rounded-md px-3 py-2 text-xs" style={{ color: '#c3c3d0' }}>Cancel</button>
            </div>
          </form>
        )}
        <div className="mt-3 overflow-x-auto rounded-lg border" style={{ borderColor: 'rgba(112,112,125,0.25)' }}>
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                {['Holder', '%', 'Notes', 'Updated'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: '#8b8b9a', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {equity.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center" style={{ color: '#8b8b9a' }}>No holders recorded.</td></tr>}
              {equity.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid rgba(112,112,125,0.15)' }}>
                  <td className="px-4 py-3" style={{ color: '#f4f4f8' }}>{row.holder_name}</td>
                  <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>{row.percentage != null ? `${row.percentage}%` : '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#8b8b9a' }}>{row.notes ?? '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#8b8b9a' }}>{new Date(row.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {equity.length > 0 && (
                <tr style={{ borderTop: '1px solid rgba(112,112,125,0.3)' }}>
                  <td className="px-4 py-2 text-xs font-semibold" style={{ color: '#8b8b9a' }}>Total</td>
                  <td className="px-4 py-2 text-xs font-semibold" style={{ color: Math.abs(totalPct - 100) < 0.01 ? '#4ade80' : '#fbbf24' }}>{totalPct.toFixed(2)}%</td>
                  <td colSpan={2} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: '#f4f4f8' }}>Decision log</h2>
          {canLogDecisions && !addingDecision && (
            <button type="button" onClick={() => setAddingDecision(true)} className="rounded-md px-3 py-1.5 text-xs font-semibold" style={{ background: '#6366f1', color: '#fff' }}>+ Decision</button>
          )}
        </div>
        {addingDecision && (
          <form onSubmit={handleDecision} className="mt-3 space-y-3 rounded-lg border p-4" style={{ borderColor: 'rgba(112,112,125,0.25)' }}>
            <input name="title" required placeholder="Decision title" maxLength={200} className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle} />
            <textarea name="summary" required placeholder="What was decided and why" maxLength={4000} rows={3} className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle} />
            <div className="flex gap-2">
              <button type="submit" className="rounded-md px-3 py-2 text-xs font-semibold" style={{ background: '#6366f1', color: '#fff' }}>Log decision</button>
              <button type="button" onClick={() => setAddingDecision(false)} className="rounded-md px-3 py-2 text-xs" style={{ color: '#c3c3d0' }}>Cancel</button>
            </div>
          </form>
        )}
        <div className="mt-3 space-y-2">
          {decisions.length === 0 && <p className="text-sm" style={{ color: '#8b8b9a' }}>No decisions logged yet.</p>}
          {decisions.map((decision) => (
            <div key={decision.id} className="rounded-lg border px-4 py-3" style={{ borderColor: 'rgba(112,112,125,0.2)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: '#f4f4f8' }}>{decision.title}</p>
                <p className="text-xs" style={{ color: '#8b8b9a' }}>
                  {decision.decided?.full_name ?? 'Unknown'} · {new Date(decision.created_at).toLocaleDateString()}
                </p>
              </div>
              <p className="mt-1 text-sm" style={{ color: '#c3c3d0' }}>{decision.summary}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
