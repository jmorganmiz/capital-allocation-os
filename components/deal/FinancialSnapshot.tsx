'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Snapshot {
  id: string
  purchase_price: number | null
  noi: number | null
  cap_rate: number | null
  debt_rate: number | null
  ltv: number | null
  irr: number | null
  notes: string | null
  created_at: string
}

interface Props {
  dealId: string
  firmId: string
  snapshots: Snapshot[]
}

function fmt(val: number | null, isPercent = false): string {
  if (val === null || val === undefined) return '—'
  if (isPercent) return `${val.toFixed(2)}%`
  return `${val.toLocaleString()}`
}

export default function FinancialSnapshot({ dealId, firmId, snapshots: initial }: Props) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    purchase_price: '',
    noi: '',
    cap_rate: '',
    debt_rate: '',
    ltv: '',
    irr: '',
    notes: '',
  })

  const latest = snapshots[0]

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('deal_financial_snapshots')
        .insert({
          deal_id: dealId,
          firm_id: firmId,
          created_by: user.id,
          purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
          noi: form.noi ? parseFloat(form.noi) : null,
          cap_rate: form.cap_rate ? parseFloat(form.cap_rate) : null,
          debt_rate: form.debt_rate ? parseFloat(form.debt_rate) : null,
          ltv: form.ltv ? parseFloat(form.ltv) : null,
          irr: form.irr ? parseFloat(form.irr) : null,
          notes: form.notes || null,
        })
        .select()
        .single()

      if (!error && data) {
        setSnapshots(prev => [data, ...prev])
        setShowForm(false)
        setForm({ purchase_price: '', noi: '', cap_rate: '', debt_rate: '', ltv: '', irr: '', notes: '' })
      }
    })
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Financial Snapshot</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-secondary text-sm">
          {showForm ? 'Cancel' : '+ New Snapshot'}
        </button>
      </div>

      {showForm && (
        <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { field: 'purchase_price', label: 'Purchase Price ($)' },
              { field: 'noi', label: 'NOI ($)' },
              { field: 'cap_rate', label: 'Cap Rate (%)' },
              { field: 'debt_rate', label: 'Debt Rate (%)' },
              { field: 'ltv', label: 'LTV (%)' },
              { field: 'irr', label: 'Projected IRR (%)' },
            ].map(({ field, label }) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type="number"
                  step="any"
                  value={form[field as keyof typeof form]}
                  onChange={e => handleChange(field, e.target.value)}
                  className="input-base"
                  placeholder="—"
                />
              </div>
            ))}
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <input
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              className="input-base"
              placeholder="Assumptions, context…"
            />
          </div>
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={isPending} className="btn-primary disabled:opacity-50">
              {isPending ? 'Saving…' : 'Save Snapshot'}
            </button>
          </div>
        </div>
      )}

      {latest ? (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { label: 'Purchase Price', value: fmt(latest.purchase_price) },
              { label: 'NOI', value: fmt(latest.noi) },
              { label: 'Cap Rate', value: fmt(latest.cap_rate, true) },
              { label: 'Debt Rate', value: fmt(latest.debt_rate, true) },
              { label: 'LTV', value: fmt(latest.ltv, true) },
              { label: 'Projected IRR', value: fmt(latest.irr, true) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className="text-sm font-semibold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
          {latest.notes && (
            <p className="text-xs text-gray-500 italic">{latest.notes}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Last updated {new Date(latest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {snapshots.length > 1 && ` · ${snapshots.length} versions`}
          </p>

          {snapshots.length > 1 && (
            <div className="mt-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs text-blue-600 hover:underline"
              >
                {showHistory ? 'Hide' : 'Show'} version history ({snapshots.length - 1} previous)
              </button>

              {showHistory && (
                <div className="mt-3 space-y-3">
                  {snapshots.slice(1).map((snap, i) => (
                    <div key={snap.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                      <p className="text-xs text-gray-400 mb-2">
                        {new Date(snap.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Purchase Price', value: fmt(snap.purchase_price) },
                          { label: 'NOI', value: fmt(snap.noi) },
                          { label: 'Cap Rate', value: fmt(snap.cap_rate, true) },
                          { label: 'Debt Rate', value: fmt(snap.debt_rate, true) },
                          { label: 'LTV', value: fmt(snap.ltv, true) },
                          { label: 'IRR', value: fmt(snap.irr, true) },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="text-xs text-gray-400">{label}</p>
                            <p className="text-xs font-medium text-gray-700">{value}</p>
                          </div>
                        ))}
                      </div>
                      {snap.notes && <p className="text-xs text-gray-500 italic mt-2">{snap.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400">
          No financial data yet. Add a snapshot to track assumptions.
        </div>
      )}
    </section>
  )
}
