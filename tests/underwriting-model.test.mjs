import assert from 'node:assert/strict'
import test from 'node:test'
import {
  UNDERWRITING_MODEL_VERSION,
  buildDebtSchedule,
  calculateIrr,
  runUnderwriting,
} from '../lib/underwriting-model.mjs'

const BASE_INPUT = {
  purchasePrice: 10_000_000,
  totalUnits: 100,
  totalNrsf: 80_000,
  unitMix: [
    { units: 100, currentRent: 1_200, marketRent: 1_400, renovationPremium: 0 },
  ],
  payroll: 140_000,
  repairsMaintenance: 90_000,
  contractServices: 45_000,
  marketing: 12_000,
  administration: 30_000,
  utilities: 100_000,
  propertyTaxes: 180_000,
  insurance: 70_000,
  renovationCostPerUnit: 12_000,
  unitsRenovatedPerYear: 20,
  ltv: 0.65,
  interestRate: 0.06,
  amortizationYears: 30,
  interestOnlyMonths: 12,
  loanTermYears: 5,
  rentGrowthInPlace: 0.03,
  rentGrowthRenovated: 0.03,
  expenseGrowth: 0.025,
  vacancyPct: 0.07,
  holdPeriodYears: 5,
  exitCapRate: 0.055,
  saleCostsPct: 0.015,
}

test('IRR solves a known one-period cash flow', () => {
  assert.ok(Math.abs(calculateIrr([-100, 110]) - 0.1) < 1e-8)
  assert.equal(calculateIrr([100, 110]), null)
})

test('interest-only debt retains principal while amortizing debt pays it down', () => {
  const interestOnly = buildDebtSchedule({
    principal: 1_000_000,
    annualInterestRate: 0.06,
    amortizationYears: 0,
    interestOnlyMonths: 60,
    holdPeriodYears: 5,
  })
  const amortizing = buildDebtSchedule({
    principal: 1_000_000,
    annualInterestRate: 0.06,
    amortizationYears: 30,
    interestOnlyMonths: 0,
    holdPeriodYears: 5,
  })

  assert.equal(interestOnly.balanceAtExit, 1_000_000)
  assert.ok(amortizing.balanceAtExit < 950_000)
  assert.ok(amortizing.annualPrincipalPaydown.every((value) => value > 0))
})

test('partial interest-only periods are represented in annual debt service', () => {
  const schedule = buildDebtSchedule({
    principal: 1_000_000,
    annualInterestRate: 0.06,
    amortizationYears: 30,
    interestOnlyMonths: 6,
    holdPeriodYears: 2,
  })

  assert.equal(schedule.annualDebtService.length, 2)
  assert.ok(schedule.annualPrincipalPaydown[0] > 0)
  assert.ok(schedule.annualPrincipalPaydown[1] > schedule.annualPrincipalPaydown[0])
})

test('underwriting produces versioned, finite outputs and correct amortizing payoff', () => {
  const output = runUnderwriting(BASE_INPUT)

  assert.equal(output.modelVersion, UNDERWRITING_MODEL_VERSION)
  assert.equal(output.noiByYear.length, 5)
  assert.equal(output.debtServiceByYear.length, 5)
  assert.ok(output.loanBalanceAtExit < BASE_INPUT.purchasePrice * BASE_INPUT.ltv)
  assert.ok(Number.isFinite(output.leveredIrr))
  assert.ok(Number.isFinite(output.equityMultiple))
  assert.ok(output.warnings.length >= 3)
})

test('forward exit NOI is explicit and produces a higher exit value under positive growth', () => {
  const forward = runUnderwriting({ ...BASE_INPUT, exitNoiConvention: 'forward' })
  const trailing = runUnderwriting({ ...BASE_INPUT, exitNoiConvention: 'trailing' })

  assert.equal(forward.exitNoiConvention, 'forward')
  assert.equal(trailing.exitNoiConvention, 'trailing')
  assert.ok(forward.grossExitValue > trailing.grossExitValue)
})

test('unsupported refinance assumptions fail loudly', () => {
  assert.throws(
    () => runUnderwriting({ ...BASE_INPUT, loanTermYears: 3, holdPeriodYears: 5 }),
    /refinance modeling is enabled/,
  )
})

test('unit mix must reconcile to property units', () => {
  assert.throws(
    () => runUnderwriting({ ...BASE_INPUT, totalUnits: 101 }),
    /must equal totalUnits/,
  )
})

