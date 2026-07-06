import assert from 'node:assert/strict'
import test from 'node:test'
import { ADVANCED_UNDERWRITING_MODEL_VERSION, runMonthlyUnderwriting } from '../lib/underwriting-model-v3.mjs'

const BASE = {
  purchasePrice: 10_000_000,
  totalUnits: 100,
  unitMix: [{ units: 100, unitsToRenovate: 100, currentRent: 1_200, marketRent: 1_500 }],
  payroll: 140_000,
  repairsMaintenance: 90_000,
  contractServices: 45_000,
  marketing: 12_000,
  administration: 30_000,
  utilities: 100_000,
  propertyTaxes: 180_000,
  insurance: 70_000,
  renovationCostPerUnit: 12_000,
  unitsRenovatedPerYear: 24,
  ltv: 0.65,
  interestRate: 0.06,
  amortizationYears: 30,
  interestOnlyMonths: 12,
  loanTermYears: 10,
  rentGrowthInPlace: 0.03,
  rentGrowthRenovated: 0.03,
  expenseGrowth: 0.025,
  vacancyPct: 0.07,
  holdPeriodYears: 5,
  exitCapRate: 0.055,
  projectionStartDate: '2026-01-01',
}

test('monthly model produces auditable monthly and annual schedules', () => {
  const output = runMonthlyUnderwriting(BASE)
  assert.equal(output.modelVersion, ADVANCED_UNDERWRITING_MODEL_VERSION)
  assert.equal(output.monthly.length, 72)
  assert.equal(output.projectCashflows.length, 61)
  assert.equal(output.noiByYear.length, 5)
  assert.ok(output.monthly[12].renovatedUnits > output.monthly[0].renovatedUnits)
  assert.ok(Number.isFinite(output.leveredIrr))
  assert.ok(Number.isFinite(output.yearOneDscr))
})

test('refinance retires acquisition and construction debt without creating phantom value', () => {
  const output = runMonthlyUnderwriting({
    ...BASE,
    refinanceEnabled: true,
    refinanceMonth: 30,
    refinanceLtv: 0.6,
    refinanceInterestRate: 0.055,
    refinanceCapRate: 0.06,
    constructionDraws: [{ month: 6, amount: 200_000 }, { month: 12, amount: 200_000 }],
    constructionLoanPct: 0.5,
    constructionLoanInterestRate: 0.08,
  })
  const refiMonth = output.monthly[29]
  assert.equal(refiMonth.acquisitionBalance, 0)
  assert.equal(refiMonth.constructionBalance, 0)
  assert.ok(refiMonth.refiBalance > 0)
  assert.ok(Number.isFinite(output.refinance.proceeds))
  assert.ok(output.loanBalanceAtExit >= 0)
})

test('property reassessment and investor tax layers reduce distributable returns', () => {
  const untaxed = runMonthlyUnderwriting(BASE)
  const taxed = runMonthlyUnderwriting({
    ...BASE,
    propertyTaxReassessmentMonth: 13,
    reassessedAnnualPropertyTaxes: 300_000,
    incomeTaxRate: 0.25,
    capitalGainsTaxRate: 0.2,
    depreciationRecaptureTaxRate: 0.25,
  })
  assert.ok(taxed.taxes.incomeTax > 0)
  assert.ok(taxed.taxes.accumulatedDepreciation > 0)
  assert.ok(taxed.netSaleProceeds < untaxed.netSaleProceeds)
  assert.ok(taxed.leveredIrr < untaxed.leveredIrr)
})

test('construction draws reconcile debt and equity funding', () => {
  const output = runMonthlyUnderwriting({
    ...BASE,
    constructionDraws: [{ month: 3, amount: 100_000 }, { month: 4, amount: 300_000 }],
    constructionLoanPct: 0.75,
    constructionLoanInterestRate: 0.09,
  })
  const draws = output.monthly.slice(0, 5)
  assert.equal(draws.reduce((sum, row) => sum + row.constructionDraw, 0), 400_000)
  assert.equal(draws.reduce((sum, row) => sum + row.debtFundedDraw, 0), 300_000)
  assert.equal(draws.reduce((sum, row) => sum + row.equityFundedDraw, 0), 100_000)
  assert.ok(draws[3].constructionInterest > 0)
})

test('waterfall allocates every project cash flow between LP and GP', () => {
  const output = runMonthlyUnderwriting({
    ...BASE,
    waterfall: { enabled: true, lpEquityShare: 0.9, preferredReturn: 0.08, gpCatchUpPct: 1, promotePct: 0.2, secondTierEquityMultiple: 2, secondTierPromotePct: 0.3 },
  })
  assert.ok(output.waterfall)
  for (let index = 0; index < output.projectCashflows.length; index += 1) {
    assert.ok(Math.abs(output.waterfall.lpCashflows[index] + output.waterfall.gpCashflows[index] - output.projectCashflows[index]) < 0.01)
  }
  assert.ok(Number.isFinite(output.waterfall.lpIrr))
  assert.ok(Number.isFinite(output.waterfall.gpIrr))
})
