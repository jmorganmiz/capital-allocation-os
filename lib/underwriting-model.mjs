export const UNDERWRITING_MODEL_VERSION = 'va-multifamily-0.1.0'

function assertFinite(name, value, { min = -Infinity, max = Infinity } = {}) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be between ${min} and ${max}`)
  }
}

function npv(rate, cashflows) {
  return cashflows.reduce((total, cashflow, period) => total + cashflow / ((1 + rate) ** period), 0)
}

export function calculateIrr(cashflows, guess = 0.1) {
  if (!Array.isArray(cashflows) || cashflows.length < 2) return null
  if (!cashflows.some((value) => value < 0) || !cashflows.some((value) => value > 0)) return null

  let rate = guess
  for (let iteration = 0; iteration < 200; iteration += 1) {
    const value = npv(rate, cashflows)
    const derivative = cashflows.reduce(
      (total, cashflow, period) => total - (period * cashflow) / ((1 + rate) ** (period + 1)),
      0,
    )
    if (!Number.isFinite(value) || !Number.isFinite(derivative) || derivative === 0) break
    const next = rate - value / derivative
    if (!Number.isFinite(next) || next <= -0.999999) break
    if (Math.abs(next - rate) < 1e-9) return next
    rate = next
  }

  let low = -0.5
  let high = 2
  let lowValue = npv(low, cashflows)
  let highValue = npv(high, cashflows)
  for (const widerHigh of [5, 10]) {
    if (lowValue * highValue <= 0) break
    high = widerHigh
    highValue = npv(high, cashflows)
  }
  if (lowValue * highValue > 0) return null

  for (let iteration = 0; iteration < 120; iteration += 1) {
    const midpoint = (low + high) / 2
    const midpointValue = npv(midpoint, cashflows)
    if (Math.abs(midpointValue) < 1e-8 || high - low < 1e-9) return midpoint
    if (lowValue * midpointValue <= 0) {
      high = midpoint
      highValue = midpointValue
    } else {
      low = midpoint
      lowValue = midpointValue
    }
  }
  return (low + high) / 2
}

export function buildDebtSchedule({
  principal,
  annualInterestRate,
  amortizationYears,
  interestOnlyMonths = 0,
  holdPeriodYears,
}) {
  assertFinite('principal', principal, { min: 0 })
  assertFinite('annualInterestRate', annualInterestRate, { min: 0, max: 1 })
  assertFinite('amortizationYears', amortizationYears, { min: 0, max: 50 })
  assertFinite('interestOnlyMonths', interestOnlyMonths, { min: 0, max: 600 })
  assertFinite('holdPeriodYears', holdPeriodYears, { min: 1, max: 15 })

  const totalMonths = Math.round(holdPeriodYears * 12)
  const ioMonths = Math.min(Math.round(interestOnlyMonths), totalMonths)
  const monthlyRate = annualInterestRate / 12
  const amortizationMonths = Math.round(amortizationYears * 12)
  let amortizingPayment = 0

  if (principal > 0 && amortizationMonths > 0) {
    amortizingPayment = monthlyRate === 0
      ? principal / amortizationMonths
      : principal * (monthlyRate * ((1 + monthlyRate) ** amortizationMonths))
        / (((1 + monthlyRate) ** amortizationMonths) - 1)
  }

  let balance = principal
  const annualDebtService = Array.from({ length: holdPeriodYears }, () => 0)
  const annualPrincipalPaydown = Array.from({ length: holdPeriodYears }, () => 0)

  for (let month = 1; month <= totalMonths; month += 1) {
    const yearIndex = Math.floor((month - 1) / 12)
    const interest = balance * monthlyRate
    const isInterestOnly = month <= ioMonths || amortizationMonths === 0
    const scheduledPayment = isInterestOnly ? interest : amortizingPayment
    const principalPayment = isInterestOnly ? 0 : Math.min(balance, Math.max(0, scheduledPayment - interest))
    const payment = interest + principalPayment

    balance = Math.max(0, balance - principalPayment)
    annualDebtService[yearIndex] += payment
    annualPrincipalPaydown[yearIndex] += principalPayment
  }

  return {
    annualDebtService,
    annualPrincipalPaydown,
    balanceAtExit: balance,
    monthlyAmortizingPayment: amortizingPayment,
  }
}

function validateInputs(input) {
  assertFinite('purchasePrice', input.purchasePrice, { min: 1 })
  assertFinite('totalUnits', input.totalUnits, { min: 1 })
  assertFinite('totalNrsf', input.totalNrsf ?? 0, { min: 0 })
  assertFinite('ltv', input.ltv, { min: 0, max: 1 })
  assertFinite('interestRate', input.interestRate, { min: 0, max: 1 })
  assertFinite('holdPeriodYears', input.holdPeriodYears, { min: 1, max: 15 })
  assertFinite('loanTermYears', input.loanTermYears, { min: 1, max: 50 })
  assertFinite('exitCapRate', input.exitCapRate, { min: 0.0001, max: 1 })
  assertFinite('vacancyPct', input.vacancyPct, { min: 0, max: 1 })

  if (input.loanTermYears < input.holdPeriodYears) {
    throw new RangeError('loanTermYears cannot be shorter than holdPeriodYears until refinance modeling is enabled')
  }
  if (!Array.isArray(input.unitMix) || input.unitMix.length === 0) {
    throw new RangeError('unitMix must include at least one row')
  }
  const mixUnits = input.unitMix.reduce((total, row) => total + row.units, 0)
  if (mixUnits !== input.totalUnits) {
    throw new RangeError(`unitMix units (${mixUnits}) must equal totalUnits (${input.totalUnits})`)
  }
}

export function runUnderwriting(input) {
  const normalized = {
    closingCostsPct: 0.015,
    payroll: 0,
    repairsMaintenance: 0,
    contractServices: 0,
    marketing: 0,
    administration: 0,
    utilities: 0,
    propertyTaxes: 0,
    insurance: 0,
    propertyMgmtFeePct: 0.03,
    replacementReservesPerUnit: 250,
    renovationCostPerUnit: 0,
    unitsRenovatedPerYear: 0,
    otherCapex: 0,
    otherCapexTimingYear: 1,
    amortizationYears: 30,
    interestOnlyMonths: 0,
    rentGrowthInPlace: 0.03,
    rentGrowthRenovated: 0.03,
    expenseGrowth: 0.025,
    saleCostsPct: 0.015,
    upfrontCapexReserve: 0,
    otherIncome: 0,
    otherIncomeGrowth: 0,
    exitNoiConvention: 'forward',
    ...input,
  }
  validateInputs(normalized)

  const hold = Math.round(normalized.holdPeriodYears)
  const projectionYears = hold + (normalized.exitNoiConvention === 'forward' ? 1 : 0)
  const mixUnits = normalized.unitMix.reduce((total, row) => total + row.units, 0)
  let renovatedCumulative = 0
  const noiByYear = []
  const grossRentByYear = []

  for (let year = 1; year <= projectionYears; year += 1) {
    const newlyRenovated = Math.min(
      normalized.unitsRenovatedPerYear,
      normalized.totalUnits - renovatedCumulative,
    )
    renovatedCumulative = Math.min(normalized.totalUnits, renovatedCumulative + Math.max(0, newlyRenovated))
    const inPlaceUnits = normalized.totalUnits - renovatedCumulative
    let weightedInPlaceRent = 0
    let weightedRenovatedRent = 0

    for (const row of normalized.unitMix) {
      const weight = row.units / mixUnits
      weightedInPlaceRent += weight * row.currentRent * ((1 + normalized.rentGrowthInPlace) ** (year - 1))
      weightedRenovatedRent += weight
        * (row.marketRent + (row.renovationPremium ?? 0))
        * ((1 + normalized.rentGrowthRenovated) ** (year - 1))
    }

    const grossRent = (inPlaceUnits * weightedInPlaceRent + renovatedCumulative * weightedRenovatedRent) * 12
    const otherIncome = normalized.otherIncome * ((1 + normalized.otherIncomeGrowth) ** (year - 1))
    const effectiveGrossIncome = grossRent * (1 - normalized.vacancyPct) + otherIncome
    const expenseGrowthFactor = (1 + normalized.expenseGrowth) ** (year - 1)
    const fixedOperatingExpenses = (
      normalized.payroll
      + normalized.repairsMaintenance
      + normalized.contractServices
      + normalized.marketing
      + normalized.administration
      + normalized.utilities
      + normalized.propertyTaxes
      + normalized.insurance
    ) * expenseGrowthFactor
    const managementFee = effectiveGrossIncome * normalized.propertyMgmtFeePct
    const reserves = normalized.replacementReservesPerUnit * normalized.totalUnits * expenseGrowthFactor

    grossRentByYear.push(grossRent)
    noiByYear.push(effectiveGrossIncome - fixedOperatingExpenses - managementFee - reserves)
  }

  const loanAmount = normalized.purchasePrice * normalized.ltv
  const debt = buildDebtSchedule({
    principal: loanAmount,
    annualInterestRate: normalized.interestRate,
    amortizationYears: normalized.amortizationYears,
    interestOnlyMonths: normalized.interestOnlyMonths,
    holdPeriodYears: hold,
  })

  const capexByYear = Array.from({ length: hold }, (_, index) => {
    const year = index + 1
    const remainingUnits = Math.max(0, normalized.totalUnits - normalized.unitsRenovatedPerYear * index)
    const renovatedUnits = Math.min(normalized.unitsRenovatedPerYear, remainingUnits)
    const renovation = normalized.renovationCostPerUnit * Math.max(0, renovatedUnits)
    const other = year === normalized.otherCapexTimingYear ? normalized.otherCapex : 0
    return renovation + other
  })

  const operatingNoi = noiByYear.slice(0, hold)
  const cashFlowBeforeTax = operatingNoi.map(
    (noi, index) => noi - debt.annualDebtService[index] - capexByYear[index],
  )
  const exitNoi = normalized.exitNoiConvention === 'forward' ? noiByYear[hold] : noiByYear[hold - 1]
  const grossExitValue = exitNoi / normalized.exitCapRate
  const netExitProceeds = grossExitValue * (1 - normalized.saleCostsPct)
  const equityReversion = netExitProceeds - debt.balanceAtExit
  const closingCosts = normalized.purchasePrice * normalized.closingCostsPct
  const initialEquity = normalized.purchasePrice - loanAmount + closingCosts + normalized.upfrontCapexReserve
  const leveredCashflows = [-initialEquity, ...cashFlowBeforeTax]
  leveredCashflows[leveredCashflows.length - 1] += equityReversion

  const unleveredCashflows = [-(normalized.purchasePrice + closingCosts + normalized.upfrontCapexReserve)]
  for (let index = 0; index < hold; index += 1) {
    unleveredCashflows.push(operatingNoi[index] - capexByYear[index])
  }
  unleveredCashflows[unleveredCashflows.length - 1] += netExitProceeds

  const totalDistributions = cashFlowBeforeTax.reduce((sum, value) => sum + value, 0) + equityReversion
  const yearOneDebtService = debt.annualDebtService[0]

  return {
    modelVersion: UNDERWRITING_MODEL_VERSION,
    exitNoiConvention: normalized.exitNoiConvention,
    goingInCapRate: operatingNoi[0] / normalized.purchasePrice,
    grossExitValue,
    loanBalanceAtExit: debt.balanceAtExit,
    leveredIrr: calculateIrr(leveredCashflows),
    unleveredIrr: calculateIrr(unleveredCashflows),
    equityMultiple: initialEquity ? totalDistributions / initialEquity : null,
    averageCashOnCash: initialEquity
      ? cashFlowBeforeTax.reduce((sum, value) => sum + value, 0) / hold / initialEquity
      : null,
    yearOneDscr: yearOneDebtService ? operatingNoi[0] / yearOneDebtService : null,
    totalEquityInvested: initialEquity,
    grossRentByYear: grossRentByYear.slice(0, hold),
    noiByYear: operatingNoi,
    debtServiceByYear: debt.annualDebtService,
    principalPaydownByYear: debt.annualPrincipalPaydown,
    capexByYear,
    cashFlowBeforeTax,
    warnings: [
      'Renovated units are assumed to earn renovated rent for the full projection year.',
      'Replacement reserves are deducted in the reported NOI.',
      'Refinancing and loan maturities before sale are not modeled in this version.',
      normalized.exitNoiConvention === 'forward'
        ? 'Exit value uses forward twelve-month NOI.'
        : 'Exit value uses trailing twelve-month NOI.',
    ],
  }
}

