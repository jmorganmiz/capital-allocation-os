'use client'

import { useMemo, useState, useTransition } from 'react'
import { saveQuickPencil, type QuickPencilInput } from '@/lib/actions/underwriting'
import type { UnderwritingRun } from '@/lib/types/database'

type Defaults = {
  purchasePrice: number
  totalUnits: number
  currentRent: number
  marketRent: number
  fixedOperatingExpenses: number
  propertyTaxes: number
  insurance: number
  ltv: number
  interestRate: number
}

type Props = {
  dealId: string
  entitlementLabel: string
  monthlyAllowance: number
  defaults: Defaults
  initialRuns: UnderwritingRun[]
}

type FormState = Record<keyof QuickPencilInput, string>

const scenarioOrder = { downside: 0, base: 1, upside: 2, custom: 3 }

function asNumber(value: string): number {
  return Number(value.replace(/,/g, ''))
}

function formatMoney(value: number | null | undefined): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    notation: Math.abs(value ?? 0) >= 10_000_000 ? 'compact' : 'standard',
  }).format(value ?? 0)
}

function formatPercent(value: number | null | undefined): string {
  if (!Number.isFinite(value)) return '—'
  return `${((value ?? 0) * 100).toFixed(1)}%`
}

function formatMultiple(value: number | null | undefined): string {
  if (!Number.isFinite(value)) return '—'
  return `${(value ?? 0).toFixed(2)}x`
}

function outputOf(run: UnderwritingRun): Record<string, unknown> {
  return run.output_snapshot && typeof run.output_snapshot === 'object' && !Array.isArray(run.output_snapshot)
    ? run.output_snapshot as Record<string, unknown>
    : {}
}

function InputField({
  label,
  value,
  onChange,
  suffix,
  step = '1',
  min = '0',
  format = 'number',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  suffix?: string
  step?: string
  min?: string
  format?: 'currency' | 'number' | 'decimal'
}) {
  const [focused, setFocused] = useState(false)
  const numeric = asNumber(value)
  const displayed = focused || !Number.isFinite(numeric)
    ? value
    : format === 'currency'
      ? numeric.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : format === 'decimal'
        ? numeric.toLocaleString('en-US', { maximumFractionDigits: 2 })
        : numeric.toLocaleString('en-US', { maximumFractionDigits: 0 })

  return (
    <label className="app-uw-field">
      <span>{label}</span>
      <div>
        <input
          type="text"
          inputMode="decimal"
          min={min}
          step={step}
          value={displayed}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange(event.target.value.replace(/[^0-9.-]/g, ''))}
        />
        {suffix && <small>{suffix}</small>}
      </div>
    </label>
  )
}

export default function QuickPencil({ dealId, entitlementLabel, monthlyAllowance, defaults, initialRuns }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [runs, setRuns] = useState(initialRuns)
  const [form, setForm] = useState<FormState>({
    purchasePrice: String(Math.round(defaults.purchasePrice || 0)),
    totalUnits: String(Math.round(defaults.totalUnits || 0)),
    currentRent: String(Math.round(defaults.currentRent || 1200)),
    marketRent: String(Math.round(defaults.marketRent || 1400)),
    fixedOperatingExpenses: String(Math.round(defaults.fixedOperatingExpenses || 0)),
    propertyTaxes: String(Math.round(defaults.propertyTaxes || 0)),
    insurance: String(Math.round(defaults.insurance || 0)),
    vacancyPct: '7',
    renovationCostPerUnit: '12000',
    unitsRenovatedPerYear: String(Math.max(1, Math.ceil((defaults.totalUnits || 50) / 5))),
    ltv: String(((defaults.ltv || 0.65) * 100).toFixed(0)),
    interestRate: String(((defaults.interestRate || 0.065) * 100).toFixed(2)),
    amortizationYears: '30',
    interestOnlyMonths: '12',
    holdPeriodYears: '5',
    exitCapRate: '5.75',
    rentGrowth: '3',
  })

  const orderedRuns = useMemo(
    () => [...runs].sort((a, b) => scenarioOrder[a.scenario_key] - scenarioOrder[b.scenario_key]),
    [runs],
  )

  function update(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function runPencil() {
    setError('')
    const input: QuickPencilInput = {
      purchasePrice: asNumber(form.purchasePrice),
      totalUnits: asNumber(form.totalUnits),
      currentRent: asNumber(form.currentRent),
      marketRent: asNumber(form.marketRent),
      fixedOperatingExpenses: asNumber(form.fixedOperatingExpenses),
      propertyTaxes: asNumber(form.propertyTaxes),
      insurance: asNumber(form.insurance),
      vacancyPct: asNumber(form.vacancyPct) / 100,
      renovationCostPerUnit: asNumber(form.renovationCostPerUnit),
      unitsRenovatedPerYear: asNumber(form.unitsRenovatedPerYear),
      ltv: asNumber(form.ltv) / 100,
      interestRate: asNumber(form.interestRate) / 100,
      amortizationYears: asNumber(form.amortizationYears),
      interestOnlyMonths: asNumber(form.interestOnlyMonths),
      holdPeriodYears: asNumber(form.holdPeriodYears),
      exitCapRate: asNumber(form.exitCapRate) / 100,
      rentGrowth: asNumber(form.rentGrowth) / 100,
    }

    startTransition(async () => {
      const result = await saveQuickPencil(dealId, crypto.randomUUID(), input)
      if (result.error) {
        setError(result.error)
        return
      }
      setRuns(result.runs ?? [])
    })
  }

  return (
    <section className="app-underwriting-card">
      <div className="app-underwriting-header">
        <div>
          <p>Underwriting Pro <span>{entitlementLabel}</span></p>
          <h2>Quick Pencil</h2>
          <small>Three deterministic cases. No AI assumptions and no credits consumed.</small>
        </div>
        <div className="app-underwriting-allowance">
          <strong>{monthlyAllowance}</strong>
          <span>full runs available</span>
        </div>
      </div>

      <div className="app-uw-assumption-note">
        <strong>Screening assumptions</strong>
        <span>Prefilled from the latest deal snapshot where possible. Review before running; saved outputs remain “needs review.”</span>
      </div>

      <div className="app-uw-form-sections">
        <div className="app-uw-form-section">
          <div className="app-uw-form-heading">
            <span>01</span>
            <div><strong>Property operations</strong><small>Basis, rents, and current operating load.</small></div>
          </div>
          <div className="app-uw-form-grid">
            <InputField label="Purchase price" value={form.purchasePrice} onChange={(value) => update('purchasePrice', value)} suffix="$" format="currency" />
            <InputField label="Units" value={form.totalUnits} onChange={(value) => update('totalUnits', value)} />
            <InputField label="Current avg. rent" value={form.currentRent} onChange={(value) => update('currentRent', value)} suffix="$/mo" format="currency" />
            <InputField label="Renovated rent" value={form.marketRent} onChange={(value) => update('marketRent', value)} suffix="$/mo" format="currency" />
            <InputField label="Fixed operating expenses" value={form.fixedOperatingExpenses} onChange={(value) => update('fixedOperatingExpenses', value)} suffix="$/yr" format="currency" />
            <InputField label="Property taxes" value={form.propertyTaxes} onChange={(value) => update('propertyTaxes', value)} suffix="$/yr" format="currency" />
            <InputField label="Insurance" value={form.insurance} onChange={(value) => update('insurance', value)} suffix="$/yr" format="currency" />
            <InputField label="Vacancy" value={form.vacancyPct} onChange={(value) => update('vacancyPct', value)} suffix="%" step="0.1" format="decimal" />
          </div>
        </div>

        <div className="app-uw-form-section">
          <div className="app-uw-form-heading">
            <span>02</span>
            <div><strong>Value creation</strong><small>Renovation pace, cost, and revenue growth.</small></div>
          </div>
          <div className="app-uw-form-grid three">
            <InputField label="Renovation cost" value={form.renovationCostPerUnit} onChange={(value) => update('renovationCostPerUnit', value)} suffix="$/unit" format="currency" />
            <InputField label="Units renovated / year" value={form.unitsRenovatedPerYear} onChange={(value) => update('unitsRenovatedPerYear', value)} />
            <InputField label="Annual rent growth" value={form.rentGrowth} onChange={(value) => update('rentGrowth', value)} suffix="%" step="0.1" min="-10" format="decimal" />
          </div>
        </div>

        <div className="app-uw-form-section">
          <div className="app-uw-form-heading">
            <span>03</span>
            <div><strong>Capital and exit</strong><small>Debt structure, hold period, and terminal value.</small></div>
          </div>
          <div className="app-uw-form-grid three">
            <InputField label="LTV" value={form.ltv} onChange={(value) => update('ltv', value)} suffix="%" step="0.1" format="decimal" />
            <InputField label="Interest rate" value={form.interestRate} onChange={(value) => update('interestRate', value)} suffix="%" step="0.01" format="decimal" />
            <InputField label="Amortization" value={form.amortizationYears} onChange={(value) => update('amortizationYears', value)} suffix="years" />
            <InputField label="Interest only" value={form.interestOnlyMonths} onChange={(value) => update('interestOnlyMonths', value)} suffix="months" />
            <InputField label="Hold period" value={form.holdPeriodYears} onChange={(value) => update('holdPeriodYears', value)} suffix="years" />
            <InputField label="Exit cap" value={form.exitCapRate} onChange={(value) => update('exitCapRate', value)} suffix="%" step="0.05" format="decimal" />
          </div>
        </div>
      </div>

      <div className="app-uw-run-row">
        <div>
          <strong>Scenario spread</strong>
          <span>Downside stresses vacancy, rent growth, renovation cost, and exit cap.</span>
        </div>
        <button onClick={runPencil} disabled={isPending} className="btn-primary">
          {isPending ? 'Calculating three cases…' : runs.length ? 'Run new version' : 'Run Quick Pencil'}
        </button>
      </div>

      {isPending && (
        <div className="app-uw-progress" role="status">
          <div><span /></div>
          <p>Validating inputs, building the debt schedule, calculating three cases, and saving one versioned bundle.</p>
        </div>
      )}
      {error && <p className="app-uw-error" role="alert">{error}</p>}

      {orderedRuns.length > 0 && (
        <div className="app-uw-results">
          {orderedRuns.map((run) => {
            const output = outputOf(run)
            const irr = Number(output.leveredIrr)
            return (
              <article key={run.id} data-scenario={run.scenario_key}>
                <div className="app-uw-result-title">
                  <div>
                    <p>{run.scenario_key}</p>
                    <span>Needs review</span>
                  </div>
                  <strong>{formatPercent(irr)}</strong>
                </div>
                <div className="app-uw-return-bar"><span style={{ width: `${Math.max(2, Math.min(100, irr * 400))}%` }} /></div>
                <dl>
                  <div><dt>Equity multiple</dt><dd>{formatMultiple(Number(output.equityMultiple))}</dd></div>
                  <div><dt>Year 1 DSCR</dt><dd>{Number.isFinite(Number(output.yearOneDscr)) ? `${Number(output.yearOneDscr).toFixed(2)}x` : '—'}</dd></div>
                  <div><dt>Required equity</dt><dd>{formatMoney(Number(output.totalEquityInvested))}</dd></div>
                  <div><dt>Exit value</dt><dd>{formatMoney(Number(output.grossExitValue))}</dd></div>
                </dl>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
