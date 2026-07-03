'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { runUnderwriting, UNDERWRITING_MODEL_VERSION } from '@/lib/underwriting-model.mjs'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Json, UnderwritingRun } from '@/lib/types/database'

export type QuickPencilInput = {
  purchasePrice: number
  totalUnits: number
  currentRent: number
  marketRent: number
  fixedOperatingExpenses: number
  propertyTaxes: number
  insurance: number
  vacancyPct: number
  renovationCostPerUnit: number
  unitsRenovatedPerYear: number
  ltv: number
  interestRate: number
  amortizationYears: number
  interestOnlyMonths: number
  holdPeriodYears: number
  exitCapRate: number
  rentGrowth: number
}

type ScenarioKey = 'base' | 'downside' | 'upside'

function finite(name: string, value: unknown, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be between ${min} and ${max}`)
  }
  return parsed
}

function validateInput(raw: QuickPencilInput): QuickPencilInput {
  return {
    purchasePrice: finite('Purchase price', raw.purchasePrice, 1, 10_000_000_000),
    totalUnits: Math.round(finite('Total units', raw.totalUnits, 1, 100_000)),
    currentRent: finite('Current rent', raw.currentRent, 1, 100_000),
    marketRent: finite('Market rent', raw.marketRent, 1, 100_000),
    fixedOperatingExpenses: finite('Operating expenses', raw.fixedOperatingExpenses, 0, 1_000_000_000),
    propertyTaxes: finite('Property taxes', raw.propertyTaxes, 0, 1_000_000_000),
    insurance: finite('Insurance', raw.insurance, 0, 1_000_000_000),
    vacancyPct: finite('Vacancy', raw.vacancyPct, 0, 0.5),
    renovationCostPerUnit: finite('Renovation cost', raw.renovationCostPerUnit, 0, 1_000_000),
    unitsRenovatedPerYear: Math.round(finite('Units renovated per year', raw.unitsRenovatedPerYear, 0, 100_000)),
    ltv: finite('LTV', raw.ltv, 0, 1),
    interestRate: finite('Interest rate', raw.interestRate, 0, 0.3),
    amortizationYears: Math.round(finite('Amortization', raw.amortizationYears, 0, 50)),
    interestOnlyMonths: Math.round(finite('Interest-only months', raw.interestOnlyMonths, 0, 180)),
    holdPeriodYears: Math.round(finite('Hold period', raw.holdPeriodYears, 1, 15)),
    exitCapRate: finite('Exit cap rate', raw.exitCapRate, 0.01, 0.2),
    rentGrowth: finite('Rent growth', raw.rentGrowth, -0.1, 0.2),
  }
}

function scenarioInput(base: QuickPencilInput, scenario: ScenarioKey, projectionStartDate: string) {
  const adjustment = scenario === 'downside'
    ? { vacancy: 0.02, rentGrowth: -0.01, exitCap: 0.005, renovation: 1.15 }
    : scenario === 'upside'
      ? { vacancy: -0.01, rentGrowth: 0.01, exitCap: -0.0025, renovation: 0.9 }
      : { vacancy: 0, rentGrowth: 0, exitCap: 0, renovation: 1 }

  return {
    purchasePrice: base.purchasePrice,
    totalUnits: base.totalUnits,
    totalNrsf: 0,
    unitMix: [{
      units: base.totalUnits,
      unitsToRenovate: base.totalUnits,
      currentRent: base.currentRent,
      marketRent: base.marketRent,
      renovationPremium: 0,
    }],
    payroll: base.fixedOperatingExpenses,
    propertyTaxes: base.propertyTaxes,
    insurance: base.insurance,
    vacancyPct: Math.min(0.5, Math.max(0, base.vacancyPct + adjustment.vacancy)),
    renovationCostPerUnit: base.renovationCostPerUnit * adjustment.renovation,
    unitsRenovatedPerYear: Math.min(base.totalUnits, base.unitsRenovatedPerYear),
    ltv: base.ltv,
    interestRate: base.interestRate,
    amortizationYears: base.amortizationYears,
    interestOnlyMonths: base.interestOnlyMonths,
    loanTermYears: base.holdPeriodYears,
    rentGrowthInPlace: Math.max(-0.1, base.rentGrowth + adjustment.rentGrowth),
    rentGrowthRenovated: Math.max(-0.1, base.rentGrowth + adjustment.rentGrowth),
    expenseGrowth: 0.03,
    holdPeriodYears: base.holdPeriodYears,
    exitCapRate: Math.max(0.01, base.exitCapRate + adjustment.exitCap),
    projectionStartDate,
    exitNoiConvention: 'trailing',
  }
}

export async function saveQuickPencil(
  dealId: string,
  requestId: string,
  rawInput: QuickPencilInput,
): Promise<{ runs?: UnderwritingRun[]; error?: string }> {
  try {
    if (!dealId || !requestId || requestId.length > 200) return { error: 'Invalid request.' }
    const input = validateInput(rawInput)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated.' }

    const [{ data: profile }, { data: deal }] = await Promise.all([
      supabase.from('profiles').select('firm_id').eq('id', user.id).single(),
      supabase.from('deals').select('id, firm_id').eq('id', dealId).single(),
    ])
    if (!profile || !deal || profile.firm_id !== deal.firm_id) return { error: 'Deal not found.' }

    const { data: entitlement } = await supabase
      .from('firm_entitlements')
      .select('*')
      .eq('firm_id', profile.firm_id)
      .maybeSingle()
    if (!entitlement?.underwriting_enabled) return { error: 'Underwriting Pro is not enabled for this firm.' }

    const admin = createAdminClient()
    const existingKey = `${requestId}:base`
    const { data: existing } = await admin
      .from('underwriting_runs')
      .select('*')
      .eq('firm_id', profile.firm_id)
      .eq('idempotency_key', existingKey)
    if (existing?.length) {
      const { data: bundle } = await admin
        .from('underwriting_runs')
        .select('*')
        .eq('firm_id', profile.firm_id)
        .like('idempotency_key', `${requestId}:%`)
        .order('created_at')
      return { runs: (bundle ?? []) as UnderwritingRun[] }
    }

    const now = new Date()
    const projectionStartDate = now.toISOString().slice(0, 10)
    const completedAt = now.toISOString()
    const scenarioKeys: ScenarioKey[] = ['downside', 'base', 'upside']
    const runIds = Object.fromEntries(scenarioKeys.map((key) => [key, randomUUID()])) as Record<ScenarioKey, string>

    const records = scenarioKeys.map((scenario) => {
      const modelInput = scenarioInput(input, scenario, projectionStartDate)
      const output = runUnderwriting(modelInput)
      return {
        id: runIds[scenario],
        firm_id: profile.firm_id,
        deal_id: dealId,
        parent_run_id: scenario === 'base' ? null : runIds.base,
        run_type: 'quick_pencil' as const,
        scenario_key: scenario,
        status: 'completed' as const,
        assumption_status: 'needs_review' as const,
        model_version: UNDERWRITING_MODEL_VERSION,
        projection_start_date: projectionStartDate,
        input_snapshot: modelInput as Json,
        output_snapshot: output as Json,
        warnings: output.warnings as Json,
        credits_reserved: 0,
        credits_settled: 0,
        idempotency_key: `${requestId}:${scenario}`,
        created_by: user.id,
        started_at: completedAt,
        completed_at: completedAt,
      }
    })

    const { data: runs, error: runError } = await admin
      .from('underwriting_runs')
      .insert(records)
      .select('*')
    if (runError) throw runError

    const { error: usageError } = await admin.from('usage_events').insert({
      firm_id: profile.firm_id,
      user_id: user.id,
      underwriting_run_id: runIds.base,
      event_type: 'quick_pencil',
      quantity: 1,
      billable_credits: 0,
      idempotency_key: `${requestId}:usage`,
      metadata: { scenarios: scenarioKeys, model_version: UNDERWRITING_MODEL_VERSION },
    })
    if (usageError) throw usageError

    revalidatePath(`/deals/${dealId}`)
    return { runs: (runs ?? []) as UnderwritingRun[] }
  } catch (error) {
    console.error('[underwriting] quick pencil failed:', error instanceof Error ? error.message : 'unknown error')
    return { error: error instanceof Error ? error.message : 'Quick Pencil failed.' }
  }
}

