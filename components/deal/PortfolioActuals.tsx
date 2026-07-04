'use client'

import { useEffect, useState, useTransition } from 'react'
import { savePortfolioActual } from '@/lib/actions/portfolio-actuals'
import type { PortfolioActual } from '@/lib/types/database'

function money(value: number | null) {
  return value == null ? '—' : `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function localDateValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function PortfolioActuals({ dealId, initialActuals, underwrittenYearOneNoi }: { dealId: string; initialActuals: PortfolioActual[]; underwrittenYearOneNoi: number | null }) {
  const [actuals, setActuals] = useState(initialActuals)
  const [form, setForm] = useState({ periodDate: '', noi: '', occupancy: '', averageMonthlyRent: '', capitalExpenditures: '', debtService: '', sourceReference: '', notes: '' })
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    setForm((current) => current.periodDate ? current : { ...current, periodDate: localDateValue() })
  }, [])

  function save() {
    setError('')
    startTransition(async () => {
      const result = await savePortfolioActual(dealId, form)
      if (result.error) return setError(result.error)
      if (result.actual) setActuals((current) => [result.actual as PortfolioActual, ...current.filter((item) => item.period_date !== result.actual!.period_date)])
      setForm((current) => ({ ...current, noi: '', occupancy: '', averageMonthlyRent: '', capitalExpenditures: '', debtService: '', sourceReference: '', notes: '' }))
    })
  }

  return (
    <section className="app-section app-actuals-card">
      <div className="app-settings-section-header"><div><p>Portfolio learning</p><h2>Actual performance</h2></div><span>{actuals.length} periods</span></div>
      <p className="app-settings-section-copy">Compare approved underwriting with realized operations. Actuals never overwrite the original investment case.</p>
      <div className="app-actuals-form">
        <label><span>Period</span><input type="date" value={form.periodDate} onChange={(event) => set('periodDate', event.target.value)} /></label>
        <label><span>Annualized NOI</span><input inputMode="decimal" value={form.noi} onChange={(event) => set('noi', event.target.value)} placeholder="$0" /></label>
        <label><span>Occupancy</span><input inputMode="decimal" value={form.occupancy} onChange={(event) => set('occupancy', event.target.value)} placeholder="95%" /></label>
        <label><span>Avg. monthly rent</span><input inputMode="decimal" value={form.averageMonthlyRent} onChange={(event) => set('averageMonthlyRent', event.target.value)} placeholder="$0" /></label>
        <label><span>Capex</span><input inputMode="decimal" value={form.capitalExpenditures} onChange={(event) => set('capitalExpenditures', event.target.value)} placeholder="$0" /></label>
        <label><span>Debt service</span><input inputMode="decimal" value={form.debtService} onChange={(event) => set('debtService', event.target.value)} placeholder="$0" /></label>
        <label className="wide"><span>Source</span><input value={form.sourceReference} onChange={(event) => set('sourceReference', event.target.value)} placeholder="March operating report, property manager export..." /></label>
        <label className="wide"><span>Operator notes</span><textarea value={form.notes} onChange={(event) => set('notes', event.target.value)} /></label>
      </div>
      <div className="app-sourcing-submit"><span>{error}</span><button type="button" onClick={save} disabled={pending}>{pending ? 'Saving…' : 'Save actuals'}</button></div>

      <div className="app-actuals-history">
        {actuals.length === 0 && <div className="app-sourcing-empty"><strong>No actual performance recorded.</strong><span>Add the first reporting period when operating data becomes available.</span></div>}
        {actuals.map((actual) => {
          const variance = underwrittenYearOneNoi && actual.noi != null ? (Number(actual.noi) - underwrittenYearOneNoi) / underwrittenYearOneNoi : null
          return <div key={actual.id}><span>{new Date(`${actual.period_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span><strong>{money(actual.noi)} NOI</strong><em data-tone={variance == null ? 'neutral' : variance >= 0 ? 'green' : 'red'}>{variance == null ? 'No baseline' : `${variance >= 0 ? '+' : ''}${(variance * 100).toFixed(1)}% vs UW`}</em><small>{actual.occupancy == null ? 'Occupancy —' : `${(Number(actual.occupancy) * 100).toFixed(1)}% occupied`} · {actual.source_reference ?? 'Source not noted'}</small></div>
        })}
      </div>
    </section>
  )
}
