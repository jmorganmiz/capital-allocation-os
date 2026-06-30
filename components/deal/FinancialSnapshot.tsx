'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { showToast } from '@/lib/toast'

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
  return `$${val.toLocaleString()}`
}

function FinancialMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="app-deal-metric">
      <p>{label}</p>
      <strong data-empty={value === '—'}>{value}</strong>
    </div>
  )
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
    setForm((prev) => ({ ...prev, [field]: value }))
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
        setSnapshots((prev) => [data, ...prev])
        setShowForm(false)
        setForm({ purchase_price: '', noi: '', cap_rate: '', debt_rate: '', ltv: '', irr: '', notes: '' })
      } else if (error) {
        showToast(error.message, 'error')
      }
    })
  }

  const fields = [
    { field: 'purchase_price', label: 'Purchase Price ($)' },
    { field: 'noi', label: 'NOI ($)' },
    { field: 'cap_rate', label: 'Cap Rate (%)' },
    { field: 'debt_rate', label: 'Debt Rate (%)' },
    { field: 'ltv', label: 'LTV (%)' },
    { field: 'irr', label: 'Projected IRR (%)' },
  ]

  const metrics = latest ? [
    { label: 'Purchase Price', value: fmt(latest.purchase_price) },
    { label: 'NOI', value: fmt(latest.noi) },
    { label: 'Cap Rate', value: fmt(latest.cap_rate, true) },
    { label: 'Debt Rate', value: fmt(latest.debt_rate, true) },
    { label: 'LTV', value: fmt(latest.ltv, true) },
    { label: 'Projected IRR', value: fmt(latest.irr, true) },
  ] : []

  return (
    <>
      <div className="app-deal-section-header">
        <div>
          <p>Underwriting</p>
          <h2>Financials</h2>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="app-deal-pill-button">
          {showForm ? 'Cancel' : '+ Snapshot'}
        </button>
      </div>

      {showForm && (
        <div className="app-deal-form-panel">
          <div className="app-deal-form-grid three">
            {fields.map(({ field, label }) => (
              <label key={field} className="app-deal-field">
                <span>{label}</span>
                <input
                  type="number"
                  step="any"
                  value={form[field as keyof typeof form]}
                  onChange={(event) => handleChange(field, event.target.value)}
                  placeholder="—"
                />
              </label>
            ))}
          </div>

          <label className="app-deal-field">
            <span>Notes</span>
            <input
              value={form.notes}
              onChange={(event) => handleChange('notes', event.target.value)}
              placeholder="Assumptions, context..."
            />
          </label>

          <div className="app-deal-form-actions">
            <button onClick={handleSave} disabled={isPending} data-primary="true">
              {isPending ? 'Saving...' : 'Save Snapshot'}
            </button>
          </div>
        </div>
      )}

      {latest ? (
        <div>
          <div className="app-deal-metric-grid three">
            {metrics.map(({ label, value }) => (
              <FinancialMetric key={label} label={label} value={value} />
            ))}
          </div>

          <div className="app-deal-section-foot">
            {latest.notes && <p>{latest.notes}</p>}
            <span>
              Updated {new Date(latest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {snapshots.length > 1 ? ` · ${snapshots.length} versions` : ''}
            </span>
          </div>

          {snapshots.length > 1 && (
            <div className="app-deal-history">
              <button onClick={() => setShowHistory(!showHistory)}>
                {showHistory ? 'Hide' : 'Show'} version history ({snapshots.length - 1} previous)
              </button>

              {showHistory && (
                <div className="app-deal-history-list">
                  {snapshots.slice(1).map((snap) => (
                    <div key={snap.id} className="app-deal-history-card">
                      <p>{new Date(snap.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <div className="app-deal-history-grid">
                        {[
                          { label: 'Price', value: fmt(snap.purchase_price) },
                          { label: 'NOI', value: fmt(snap.noi) },
                          { label: 'Cap Rate', value: fmt(snap.cap_rate, true) },
                          { label: 'Debt Rate', value: fmt(snap.debt_rate, true) },
                          { label: 'LTV', value: fmt(snap.ltv, true) },
                          { label: 'IRR', value: fmt(snap.irr, true) },
                        ].map(({ label, value }) => (
                          <span key={label}><em>{label}</em>{value}</span>
                        ))}
                      </div>
                      {snap.notes && <small>{snap.notes}</small>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="app-deal-empty">
          No financial data yet. Add a snapshot to track assumptions.
        </div>
      )}
    </>
  )
}
