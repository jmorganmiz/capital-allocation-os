import assert from 'node:assert/strict'
import test from 'node:test'
import {
  UNDERWRITING_MODEL_VERSION,
  buildDebtSchedule,
  calculateIrr,
  calculateXirr,
  runUnderwriting,
} from '../lib/underwriting-model.mjs'

const BASE_INPUT = {
  purchasePrice: 10_000_000,
  totalUnits: 100,
  totalNrsf: 80_000,
  unitMix: [
    { units: 100, unitsToRenovate: 100, currentRent: 1_200, marketRent: 1_400, renovationPremium: 0 },
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

test('XIRR respects actual day counts', () => {
  const result = calculateXirr(
    [-100, 110],
    [new Date('2025-01-01T00:00:00Z'), new Date('2026-01-01T00:00:00Z')],
  )
  assert.ok(Math.abs(result - 0.1) < 1e-8)
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

test('saved Excel sample reconciles to the source workbook golden outputs', () => {
  const output = runUnderwriting({
    purchasePrice: 14_000_000,
    totalUnits: 150,
    totalNrsf: 135_000,
    closingCostsPct: 0.015,
    unitMix: [
      { units: 60, unitsToRenovate: 60, currentRent: 1_050, marketRent: 1_150 },
      { units: 70, unitsToRenovate: 70, currentRent: 1_350, marketRent: 1_450 },
      { units: 20, unitsToRenovate: 20, currentRent: 1_650, marketRent: 1_775 },
    ],
    payroll: 345_000,
    repairsMaintenance: 150_000,
    contractServices: 90_000,
    marketing: 45_000,
    administration: 65_000,
    utilities: 195_000,
    propertyTaxes: 270_000,
    insurance: 95_000,
    propertyMgmtFeePct: 0.03,
    replacementReservesPerUnit: 250,
    renovationCostPerUnit: 8_500,
    unitsRenovatedPerYear: 30,
    otherCapex: 400_000,
    otherCapexTimingYear: 1,
    ltv: 0.65,
    interestRate: 0.065,
    amortizationYears: 30,
    interestOnlyMonths: 24,
    loanTermYears: 5,
    rentGrowthInPlace: 0.03,
    rentGrowthRenovated: 0.04,
    expenseGrowth: 0.025,
    vacancyPct: 0.08,
    holdPeriodYears: 5,
    exitCapRate: 0.0525,
    saleCostsPct: 0.015,
    upfrontCapexReserve: 250_000,
    exitNoiConvention: 'trailing',
    projectionStartDate: '2025-01-01',
  })

  assert.ok(Math.abs(output.goingInCapRate - 0.05339474285714285) < 1e-10)
  assert.ok(Math.abs(output.grossExitValue - 20_897_404.61092113) < 0.01)
  assert.ok(Math.abs(output.loanBalanceAtExit - 8_773_969.013301916) < 0.01)
  assert.ok(Math.abs(output.leveredIrr - 0.15473706126213077) < 1e-8)
  assert.ok(Math.abs(output.unleveredIrr - 0.10580973029136659) < 1e-8)
  assert.ok(Math.abs(output.equityMultiple - 2.020881932970705) < 1e-10)
  assert.ok(Math.abs(output.averageCashOnCash - (-0.014376326462740674)) < 1e-10)
  assert.ok(Math.abs(output.yearOneDscr - 1.2637808960270498) < 1e-10)
  assert.equal(output.totalEquityInvested, 5_360_000)
})
