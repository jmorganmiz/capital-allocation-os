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
  vacancyPct: number
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

type FormState = Record<Exclude<keyof QuickPencilInput, 'equityClasses'>, string>
type EquityTierForm = { id: string; hurdleIrr: string; promotePct: string }
type EquityClassForm = {
  id: string
  name: string
  capitalShare: string
  lpEquityShare: string
  preferredReturn: string
  tiers: EquityTierForm[]
}

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

function inputOf(run: UnderwritingRun): Record<string, unknown> {
  return run.input_snapshot && typeof run.input_snapshot === 'object' && !Array.isArray(run.input_snapshot)
    ? run.input_snapshot as Record<string, unknown>
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
    vacancyPct: String(((defaults.vacancyPct ?? 0.07) * 100).toFixed(2)),
    renovationCostPerUnit: '12000',
    unitsRenovatedPerYear: String(Math.max(1, Math.ceil((defaults.totalUnits || 50) / 5))),
    ltv: String(((defaults.ltv || 0.65) * 100).toFixed(0)),
    interestRate: String(((defaults.interestRate || 0.065) * 100).toFixed(2)),
    amortizationYears: '30',
    interestOnlyMonths: '12',
    holdPeriodYears: '5',
    exitCapRate: '5.75',
    rentGrowth: '3',
    renovationDowntimeMonths: '1',
    propertyTaxReassessmentMonth: '13',
    reassessedAnnualPropertyTaxes: String(Math.round((defaults.propertyTaxes || 0) * 1.1)),
    refinanceEnabled: '0',
    refinanceMonth: '36',
    refinanceLtv: '65',
    refinanceInterestRate: '6.5',
    refinanceCostsPct: '1',
    constructionDrawAmount: '0',
    constructionDrawMonth: '6',
    constructionLoanPct: '0',
    constructionLoanInterestRate: '8',
    incomeTaxRate: '0',
    capitalGainsTaxRate: '0',
    depreciationRecaptureTaxRate: '0',
    waterfallEnabled: '0',
    lpEquityShare: '90',
    preferredReturn: '8',
    promotePct: '20',
    secondTierEquityMultiple: '2',
    secondTierPromotePct: '30',
    operatingReserveAmount: '0',
  })
  const [equityClasses, setEquityClasses] = useState<EquityClassForm[]>([])

  const orderedRuns = useMemo(
    () => [...runs].sort((a, b) => scenarioOrder[a.scenario_key] - scenarioOrder[b.scenario_key]),
    [runs],
  )

  function update(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function addEquityClass() {
    setForm((current) => ({ ...current, waterfallEnabled: '1' }))
    setEquityClasses((current) => [...current, {
      id: crypto.randomUUID(),
      name: `Class ${String.fromCharCode(65 + current.length)}`,
      capitalShare: current.length ? '0' : '100',
      lpEquityShare: '90',
      preferredReturn: '8',
      tiers: [
        { id: crypto.randomUUID(), hurdleIrr: '8', promotePct: '0' },
        { id: crypto.randomUUID(), hurdleIrr: '', promotePct: '20' },
      ],
    }])
  }

  function updateEquityClass(id: string, patch: Partial<EquityClassForm>) {
    setEquityClasses((current) => current.map((equityClass) => equityClass.id === id ? { ...equityClass, ...patch } : equityClass))
  }

  function updateEquityTier(classId: string, tierId: string, patch: Partial<EquityTierForm>) {
    setEquityClasses((current) => current.map((equityClass) => equityClass.id === classId
      ? { ...equityClass, tiers: equityClass.tiers.map((tier) => tier.id === tierId ? { ...tier, ...patch } : tier) }
      : equityClass))
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
      renovationDowntimeMonths: asNumber(form.renovationDowntimeMonths),
      propertyTaxReassessmentMonth: asNumber(form.propertyTaxReassessmentMonth),
      reassessedAnnualPropertyTaxes: asNumber(form.reassessedAnnualPropertyTaxes),
      refinanceEnabled: asNumber(form.refinanceEnabled),
      refinanceMonth: asNumber(form.refinanceMonth),
      refinanceLtv: asNumber(form.refinanceLtv) / 100,
      refinanceInterestRate: asNumber(form.refinanceInterestRate) / 100,
      refinanceCostsPct: asNumber(form.refinanceCostsPct) / 100,
      constructionDrawAmount: asNumber(form.constructionDrawAmount),
      constructionDrawMonth: asNumber(form.constructionDrawMonth),
      constructionLoanPct: asNumber(form.constructionLoanPct) / 100,
      constructionLoanInterestRate: asNumber(form.constructionLoanInterestRate) / 100,
      incomeTaxRate: asNumber(form.incomeTaxRate) / 100,
      capitalGainsTaxRate: asNumber(form.capitalGainsTaxRate) / 100,
      depreciationRecaptureTaxRate: asNumber(form.depreciationRecaptureTaxRate) / 100,
      waterfallEnabled: asNumber(form.waterfallEnabled),
      lpEquityShare: asNumber(form.lpEquityShare) / 100,
      preferredReturn: asNumber(form.preferredReturn) / 100,
      promotePct: asNumber(form.promotePct) / 100,
      secondTierEquityMultiple: asNumber(form.secondTierEquityMultiple),
      secondTierPromotePct: asNumber(form.secondTierPromotePct) / 100,
      operatingReserveAmount: asNumber(form.operatingReserveAmount),
      equityClasses: equityClasses.map((equityClass, classIndex) => ({
        key: `class-${classIndex + 1}-${equityClass.id.slice(0, 8)}`,
        name: equityClass.name,
        capitalShare: asNumber(equityClass.capitalShare) / 100,
        lpEquityShare: asNumber(equityClass.lpEquityShare) / 100,
        preferredReturn: asNumber(equityClass.preferredReturn) / 100,
        promoteTiers: equityClass.tiers.map((tier) => ({
          hurdleIrr: tier.hurdleIrr.trim() ? asNumber(tier.hurdleIrr) / 100 : null,
          promotePct: asNumber(tier.promotePct) / 100,
        })),
      })),
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

        <details className="app-uw-advanced">
          <summary>
            <span>04</span>
            <div><strong>Full Underwrite assumptions</strong><small>Monthly timing, refinance, capital draws, taxes, and sponsor economics.</small></div>
            <b>Optional</b>
          </summary>
          <div className="app-uw-advanced-body">
            <div className="app-uw-advanced-group">
              <div><strong>Monthly operations</strong><small>Timing and liquidity assumptions used by model v0.4.</small></div>
              <div className="app-uw-form-grid three">
                <InputField label="Renovation downtime" value={form.renovationDowntimeMonths} onChange={(value) => update('renovationDowntimeMonths', value)} suffix="months" />
                <InputField label="Tax reassessment month" value={form.propertyTaxReassessmentMonth} onChange={(value) => update('propertyTaxReassessmentMonth', value)} suffix="month" />
                <InputField label="Reassessed property taxes" value={form.reassessedAnnualPropertyTaxes} onChange={(value) => update('reassessedAnnualPropertyTaxes', value)} suffix="$/yr" format="currency" />
                <InputField label="Operating reserve" value={form.operatingReserveAmount} onChange={(value) => update('operatingReserveAmount', value)} suffix="$" format="currency" />
              </div>
            </div>
            <div className="app-uw-advanced-group">
              <div><strong>Refinance</strong><small>Set enabled to 1 to model a refinance constrained by LTV and DSCR.</small></div>
              <div className="app-uw-form-grid three">
                <InputField label="Refinance enabled (0/1)" value={form.refinanceEnabled} onChange={(value) => update('refinanceEnabled', value)} />
                <InputField label="Refinance month" value={form.refinanceMonth} onChange={(value) => update('refinanceMonth', value)} />
                <InputField label="Refinance LTV" value={form.refinanceLtv} onChange={(value) => update('refinanceLtv', value)} suffix="%" format="decimal" />
                <InputField label="Refinance rate" value={form.refinanceInterestRate} onChange={(value) => update('refinanceInterestRate', value)} suffix="%" format="decimal" />
                <InputField label="Refinance costs" value={form.refinanceCostsPct} onChange={(value) => update('refinanceCostsPct', value)} suffix="%" format="decimal" />
              </div>
            </div>
            <div className="app-uw-advanced-group">
              <div><strong>Capital draws</strong><small>One scheduled draw in this release; the workbook supports a monthly draw schedule.</small></div>
              <div className="app-uw-form-grid three">
                <InputField label="Draw amount" value={form.constructionDrawAmount} onChange={(value) => update('constructionDrawAmount', value)} suffix="$" format="currency" />
                <InputField label="Draw month" value={form.constructionDrawMonth} onChange={(value) => update('constructionDrawMonth', value)} />
                <InputField label="Debt-funded share" value={form.constructionLoanPct} onChange={(value) => update('constructionLoanPct', value)} suffix="%" format="decimal" />
                <InputField label="Construction loan rate" value={form.constructionLoanInterestRate} onChange={(value) => update('constructionLoanInterestRate', value)} suffix="%" format="decimal" />
              </div>
            </div>
            <div className="app-uw-advanced-group">
              <div><strong>Taxes and waterfall</strong><small>Optional estimates. Keep tax rates at zero for pre-tax underwriting.</small></div>
              <div className="app-uw-form-grid three">
                <InputField label="Income tax rate" value={form.incomeTaxRate} onChange={(value) => update('incomeTaxRate', value)} suffix="%" format="decimal" />
                <InputField label="Capital gains rate" value={form.capitalGainsTaxRate} onChange={(value) => update('capitalGainsTaxRate', value)} suffix="%" format="decimal" />
                <InputField label="Recapture rate" value={form.depreciationRecaptureTaxRate} onChange={(value) => update('depreciationRecaptureTaxRate', value)} suffix="%" format="decimal" />
                <InputField label="Waterfall enabled (0/1)" value={form.waterfallEnabled} onChange={(value) => update('waterfallEnabled', value)} />
                <InputField label="LP equity share" value={form.lpEquityShare} onChange={(value) => update('lpEquityShare', value)} suffix="%" format="decimal" />
                <InputField label="Preferred return" value={form.preferredReturn} onChange={(value) => update('preferredReturn', value)} suffix="%" format="decimal" />
                <InputField label="Promote" value={form.promotePct} onChange={(value) => update('promotePct', value)} suffix="%" format="decimal" />
                <InputField label="Second tier EM" value={form.secondTierEquityMultiple} onChange={(value) => update('secondTierEquityMultiple', value)} suffix="x" format="decimal" />
                <InputField label="Second tier promote" value={form.secondTierPromotePct} onChange={(value) => update('secondTierPromotePct', value)} suffix="%" format="decimal" />
              </div>
              <div className="app-equity-editor-heading">
                <div><strong>Equity classes</strong><small>Optional. If used, class capital shares must total 100%. Blank final IRR hurdle means residual cash flow.</small></div>
                <button type="button" onClick={addEquityClass}>+ Add class</button>
              </div>
              {equityClasses.length > 0 && (
                <div className="app-equity-editor">
                  {equityClasses.map((equityClass) => (
                    <article key={equityClass.id}>
                      <div className="app-equity-class-header">
                        <input aria-label="Equity class name" value={equityClass.name} onChange={(event) => updateEquityClass(equityClass.id, { name: event.target.value })} />
                        <button type="button" onClick={() => setEquityClasses((current) => current.filter((item) => item.id !== equityClass.id))}>Remove</button>
                      </div>
                      <div className="app-uw-form-grid three">
                        <InputField label="Capital share" value={equityClass.capitalShare} onChange={(value) => updateEquityClass(equityClass.id, { capitalShare: value })} suffix="%" format="decimal" />
                        <InputField label="LP equity share" value={equityClass.lpEquityShare} onChange={(value) => updateEquityClass(equityClass.id, { lpEquityShare: value })} suffix="%" format="decimal" />
                        <InputField label="Preferred return" value={equityClass.preferredReturn} onChange={(value) => updateEquityClass(equityClass.id, { preferredReturn: value })} suffix="%" format="decimal" />
                      </div>
                      <div className="app-equity-tier-list">
                        {equityClass.tiers.map((tier, index) => (
                          <div key={tier.id}>
                            <span>Tier {index + 1}</span>
                            <InputField label="IRR hurdle" value={tier.hurdleIrr} onChange={(value) => updateEquityTier(equityClass.id, tier.id, { hurdleIrr: value })} suffix="%" format="decimal" />
                            <InputField label="Promote" value={tier.promotePct} onChange={(value) => updateEquityTier(equityClass.id, tier.id, { promotePct: value })} suffix="%" format="decimal" />
                            <button type="button" onClick={() => updateEquityClass(equityClass.id, { tiers: equityClass.tiers.filter((item) => item.id !== tier.id) })}>Remove tier</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => updateEquityClass(equityClass.id, { tiers: [...equityClass.tiers, { id: crypto.randomUUID(), hurdleIrr: '', promotePct: equityClass.tiers.at(-1)?.promotePct ?? '20' }] })}>+ Add tier</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </details>
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
            const input = inputOf(run)
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
                <p className="app-uw-scenario-assumptions">
                  <span>Vacancy {formatPercent(Number(input.vacancyPct))}</span>
                  <span>Growth {formatPercent(Number(input.rentGrowthInPlace))}</span>
                  <span>Exit {formatPercent(Number(input.exitCapRate))}</span>
                  <span>Reno {formatMoney(Number(input.renovationCostPerUnit))}/unit</span>
                </p>
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
          <p className="app-uw-results-note">
            Downside also applies a 10% operating-cost increase, a 75 bps debt-rate increase, and a 5% renovated-rent haircut. Every scenario definition is saved with its result.
          </p>
        </div>
      )}
    </section>
  )
}
