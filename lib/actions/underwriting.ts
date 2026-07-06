'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { runUnderwriting, UNDERWRITING_MODEL_VERSION } from '@/lib/underwriting-model.mjs'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { assertFirmAccess } from '@/lib/billing-access'
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
  renovationDowntimeMonths: number
  propertyTaxReassessmentMonth: number
  reassessedAnnualPropertyTaxes: number
  refinanceEnabled: number
  refinanceMonth: number
  refinanceLtv: number
  refinanceInterestRate: number
  refinanceCostsPct: number
  constructionDrawAmount: number
  constructionDrawMonth: number
  constructionLoanPct: number
  constructionLoanInterestRate: number
  incomeTaxRate: number
  capitalGainsTaxRate: number
  depreciationRecaptureTaxRate: number
  waterfallEnabled: number
  lpEquityShare: number
  preferredReturn: number
  promotePct: number
  secondTierEquityMultiple: number
  secondTierPromotePct: number
  operatingReserveAmount: number
  equityClasses: Array<{
    key: string
    name: string
    capitalShare: number
    lpEquityShare: number
    preferredReturn: number
    promoteTiers: Array<{ hurdleIrr: number | null; promotePct: number }>
  }>
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
  const equityClasses = (raw.equityClasses ?? []).map((equityClass, classIndex) => {
    const name = String(equityClass.name ?? '').trim().slice(0, 80)
    if (!name) throw new Error(`Equity class ${classIndex + 1} requires a name`)
    const promoteTiers = (equityClass.promoteTiers ?? []).map((tier, tierIndex) => ({
      hurdleIrr: tier.hurdleIrr == null ? null : finite(`${name} tier ${tierIndex + 1} IRR hurdle`, tier.hurdleIrr, 0, 1),
      promotePct: finite(`${name} tier ${tierIndex + 1} promote`, tier.promotePct, 0, 1),
    }))
    if (!promoteTiers.length) throw new Error(`${name} requires at least one promote tier`)
    return {
      key: String(equityClass.key || `class-${classIndex + 1}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60),
      name,
      capitalShare: finite(`${name} capital share`, equityClass.capitalShare, 0, 1),
      lpEquityShare: finite(`${name} LP equity share`, equityClass.lpEquityShare, 0, 1),
      preferredReturn: finite(`${name} preferred return`, equityClass.preferredReturn, 0, 0.5),
      promoteTiers,
    }
  })
  if (equityClasses.length) {
    const totalShare = equityClasses.reduce((sum, equityClass) => sum + equityClass.capitalShare, 0)
    if (Math.abs(totalShare - 1) > 0.000001) throw new Error('Equity class capital shares must total 100%')
  }
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
    renovationDowntimeMonths: Math.round(finite('Renovation downtime', raw.renovationDowntimeMonths, 0, 24)),
    propertyTaxReassessmentMonth: Math.round(finite('Property tax reassessment month', raw.propertyTaxReassessmentMonth, 0, 180)),
    reassessedAnnualPropertyTaxes: finite('Reassessed property taxes', raw.reassessedAnnualPropertyTaxes, 0, 1_000_000_000),
    refinanceEnabled: Math.round(finite('Refinance enabled', raw.refinanceEnabled, 0, 1)),
    refinanceMonth: Math.round(finite('Refinance month', raw.refinanceMonth, 1, 179)),
    refinanceLtv: finite('Refinance LTV', raw.refinanceLtv, 0, 1),
    refinanceInterestRate: finite('Refinance rate', raw.refinanceInterestRate, 0, 0.3),
    refinanceCostsPct: finite('Refinance costs', raw.refinanceCostsPct, 0, 0.2),
    constructionDrawAmount: finite('Construction draw', raw.constructionDrawAmount, 0, 1_000_000_000),
    constructionDrawMonth: Math.round(finite('Construction draw month', raw.constructionDrawMonth, 1, 180)),
    constructionLoanPct: finite('Construction loan funding', raw.constructionLoanPct, 0, 1),
    constructionLoanInterestRate: finite('Construction loan rate', raw.constructionLoanInterestRate, 0, 0.3),
    incomeTaxRate: finite('Income tax rate', raw.incomeTaxRate, 0, 0.6),
    capitalGainsTaxRate: finite('Capital gains tax rate', raw.capitalGainsTaxRate, 0, 0.6),
    depreciationRecaptureTaxRate: finite('Depreciation recapture rate', raw.depreciationRecaptureTaxRate, 0, 0.6),
    waterfallEnabled: Math.round(finite('Waterfall enabled', raw.waterfallEnabled, 0, 1)),
    lpEquityShare: finite('LP equity share', raw.lpEquityShare, 0, 1),
    preferredReturn: finite('Preferred return', raw.preferredReturn, 0, 0.5),
    promotePct: finite('Promote', raw.promotePct, 0, 1),
    secondTierEquityMultiple: finite('Second tier equity multiple', raw.secondTierEquityMultiple, 1, 10),
    secondTierPromotePct: finite('Second tier promote', raw.secondTierPromotePct, 0, 1),
    operatingReserveAmount: finite('Operating reserve', raw.operatingReserveAmount, 0, 1_000_000_000),
    equityClasses,
  }
}

function scenarioInput(base: QuickPencilInput, scenario: ScenarioKey, projectionStartDate: string) {
  const adjustment = scenario === 'downside'
    ? {
        vacancy: 0.03,
        rentGrowth: -0.015,
        exitCap: 0.0075,
        renovation: 1.2,
        operatingCosts: 1.1,
        interestRate: 0.0075,
        marketRent: 0.95,
      }
    : scenario === 'upside'
      ? {
          vacancy: -0.01,
          rentGrowth: 0.005,
          exitCap: -0.0025,
          renovation: 0.9,
          operatingCosts: 0.95,
          interestRate: 0,
          marketRent: 1.03,
        }
      : {
          vacancy: 0,
          rentGrowth: 0,
          exitCap: 0,
          renovation: 1,
          operatingCosts: 1,
          interestRate: 0,
          marketRent: 1,
        }

  return {
    purchasePrice: base.purchasePrice,
    totalUnits: base.totalUnits,
    totalNrsf: 0,
    unitMix: [{
      units: base.totalUnits,
      unitsToRenovate: base.totalUnits,
      currentRent: base.currentRent,
      marketRent: base.marketRent * adjustment.marketRent,
      renovationPremium: 0,
    }],
    payroll: base.fixedOperatingExpenses * adjustment.operatingCosts,
    propertyTaxes: base.propertyTaxes * adjustment.operatingCosts,
    insurance: base.insurance * adjustment.operatingCosts,
    vacancyPct: Math.min(0.5, Math.max(0, base.vacancyPct + adjustment.vacancy)),
    renovationCostPerUnit: base.renovationCostPerUnit * adjustment.renovation,
    unitsRenovatedPerYear: Math.min(base.totalUnits, base.unitsRenovatedPerYear),
    ltv: base.ltv,
    interestRate: base.interestRate + adjustment.interestRate,
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
    renovationDowntimeMonths: base.renovationDowntimeMonths,
    propertyTaxReassessmentMonth: base.propertyTaxReassessmentMonth,
    reassessedAnnualPropertyTaxes: base.reassessedAnnualPropertyTaxes || null,
    refinanceEnabled: Boolean(base.refinanceEnabled),
    refinanceMonth: Math.min(base.holdPeriodYears * 12 - 1, base.refinanceMonth),
    refinanceLtv: base.refinanceLtv,
    refinanceInterestRate: base.refinanceInterestRate + adjustment.interestRate,
    refinanceCostsPct: base.refinanceCostsPct,
    constructionDraws: base.constructionDrawAmount > 0 ? [{ month: base.constructionDrawMonth, amount: base.constructionDrawAmount }] : [],
    constructionDrawAmount: base.constructionDrawAmount,
    constructionDrawMonth: base.constructionDrawMonth,
    constructionLoanPct: base.constructionLoanPct,
    constructionLoanInterestRate: base.constructionLoanInterestRate + adjustment.interestRate,
    incomeTaxRate: base.incomeTaxRate,
    capitalGainsTaxRate: base.capitalGainsTaxRate,
    depreciationRecaptureTaxRate: base.depreciationRecaptureTaxRate,
    operatingReserveAmount: base.operatingReserveAmount,
    waterfall: {
      enabled: Boolean(base.waterfallEnabled),
      lpEquityShare: base.lpEquityShare,
      preferredReturn: base.preferredReturn,
      gpCatchUpPct: 1,
      promotePct: base.promotePct,
      secondTierEquityMultiple: base.secondTierEquityMultiple,
      secondTierPromotePct: base.secondTierPromotePct,
      classes: base.equityClasses,
    },
    waterfallEnabled: base.waterfallEnabled,
    lpEquityShare: base.lpEquityShare,
    preferredReturn: base.preferredReturn,
    promotePct: base.promotePct,
    secondTierEquityMultiple: base.secondTierEquityMultiple,
    secondTierPromotePct: base.secondTierPromotePct,
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

    const accessError = await assertFirmAccess(supabase, profile.firm_id)
    if (accessError) return { error: accessError }

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
