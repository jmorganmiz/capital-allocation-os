import { calculateXirr } from './underwriting-model.mjs'

export const ADVANCED_UNDERWRITING_MODEL_VERSION = 'va-multifamily-0.5.0'

function finite(name, value, min = -Infinity, max = Infinity) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new RangeError(`${name} must be between ${min} and ${max}`)
  }
  return number
}

function monthlyPayment(principal, annualRate, amortizationMonths) {
  if (principal <= 0 || amortizationMonths <= 0) return 0
  const rate = annualRate / 12
  return rate === 0
    ? principal / amortizationMonths
    : principal * (rate * ((1 + rate) ** amortizationMonths)) / (((1 + rate) ** amortizationMonths) - 1)
}

function addMonths(date, months) {
  const result = new Date(date)
  result.setUTCMonth(result.getUTCMonth() + months)
  return result
}

function annualize(monthly, holdYears) {
  return Array.from({ length: holdYears }, (_, year) => monthly
    .slice(year * 12, year * 12 + 12)
    .reduce((sum, value) => sum + value, 0))
}

function normalize(input) {
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
    renovationStartMonth: 1,
    renovationDowntimeMonths: 1,
    otherCapex: 0,
    otherCapexTimingYear: 1,
    amortizationYears: 30,
    interestOnlyMonths: 0,
    loanTermYears: 10,
    rentGrowthInPlace: 0.03,
    rentGrowthRenovated: 0.03,
    expenseGrowth: 0.025,
    propertyTaxGrowth: 0.025,
    propertyTaxReassessmentMonth: 0,
    reassessedAnnualPropertyTaxes: null,
    saleCostsPct: 0.015,
    upfrontCapexReserve: 0,
    operatingReserveAmount: 0,
    otherIncome: 0,
    otherIncomeGrowth: 0,
    projectionStartDate: '2025-01-01',
    exitNoiConvention: 'forward',
    refinanceEnabled: false,
    refinanceMonth: 36,
    refinanceLtv: 0.65,
    refinanceInterestRate: 0.06,
    refinanceAmortizationYears: 30,
    refinanceInterestOnlyMonths: 0,
    refinanceCostsPct: 0.01,
    refinanceCapRate: null,
    refinanceMinDscr: 1.25,
    constructionDraws: [],
    constructionLoanPct: 0,
    constructionLoanInterestRate: 0,
    incomeTaxRate: 0,
    capitalGainsTaxRate: 0,
    depreciationRecaptureTaxRate: 0,
    landValuePct: 0.2,
    depreciationYears: 27.5,
    waterfall: {
      enabled: false,
      lpEquityShare: 0.9,
      preferredReturn: 0.08,
      gpCatchUpPct: 1,
      promotePct: 0.2,
      secondTierEquityMultiple: 2,
      secondTierPromotePct: 0.3,
      classes: [],
    },
    ...input,
    waterfall: { enabled: false, lpEquityShare: 0.9, preferredReturn: 0.08, gpCatchUpPct: 1, promotePct: 0.2, secondTierEquityMultiple: 2, secondTierPromotePct: 0.3, classes: [], ...(input.waterfall ?? {}) },
  }
  finite('purchasePrice', normalized.purchasePrice, 1)
  finite('totalUnits', normalized.totalUnits, 1)
  finite('ltv', normalized.ltv, 0, 1)
  finite('interestRate', normalized.interestRate, 0, 1)
  finite('holdPeriodYears', normalized.holdPeriodYears, 1, 15)
  finite('exitCapRate', normalized.exitCapRate, 0.0001, 1)
  finite('vacancyPct', normalized.vacancyPct, 0, 1)
  finite('renovationDowntimeMonths', normalized.renovationDowntimeMonths, 0, 24)
  finite('operatingReserveAmount', normalized.operatingReserveAmount, 0)
  if (!Array.isArray(normalized.unitMix) || !normalized.unitMix.length) throw new RangeError('unitMix must include at least one row')
  const mixUnits = normalized.unitMix.reduce((sum, row) => sum + finite('unitMix units', row.units, 0), 0)
  if (mixUnits !== normalized.totalUnits) throw new RangeError(`unitMix units (${mixUnits}) must equal totalUnits (${normalized.totalUnits})`)
  if (normalized.refinanceEnabled) {
    finite('refinanceMonth', normalized.refinanceMonth, 1, normalized.holdPeriodYears * 12 - 1)
    finite('refinanceLtv', normalized.refinanceLtv, 0, 1)
    finite('refinanceMinDscr', normalized.refinanceMinDscr, 1, 10)
  }
  if (!Array.isArray(normalized.constructionDraws)) throw new RangeError('constructionDraws must be an array')
  if (!Array.isArray(normalized.waterfall.classes)) throw new RangeError('waterfall classes must be an array')
  if (normalized.waterfall.classes.length) {
    const classShares = normalized.waterfall.classes.reduce((sum, equityClass) => sum + finite('waterfall class capital share', equityClass.capitalShare, 0, 1), 0)
    if (Math.abs(classShares - 1) > 0.000001) throw new RangeError('waterfall class capital shares must total 1')
    for (const equityClass of normalized.waterfall.classes) {
      if (!equityClass.key || !equityClass.name) throw new RangeError('each waterfall class requires a key and name')
      if (equityClass.promoteTiers != null && !Array.isArray(equityClass.promoteTiers)) throw new RangeError('waterfall class promoteTiers must be an array')
    }
  }
  return normalized
}

function normalizedPromoteTiers(config) {
  const tiers = Array.isArray(config.promoteTiers) && config.promoteTiers.length
    ? config.promoteTiers
    : [
        { hurdleEquityMultiple: config.secondTierEquityMultiple, promotePct: config.promotePct },
        { hurdleEquityMultiple: null, promotePct: config.secondTierPromotePct },
      ]
  const priorHurdle = { irr: 0, equity_multiple: 0 }
  return tiers.map((tier, index) => {
    const hurdleType = tier.hurdleIrr != null ? 'irr' : 'equity_multiple'
    const rawHurdle = hurdleType === 'irr' ? tier.hurdleIrr : tier.hurdleEquityMultiple
    const hurdle = rawHurdle == null ? null : finite(`promote tier ${index + 1} hurdle`, rawHurdle, 0)
    if (hurdle != null && hurdle < priorHurdle[hurdleType]) throw new RangeError(`promote tier ${hurdleType} hurdles must be ascending`)
    if (hurdle != null) priorHurdle[hurdleType] = hurdle
    return {
      hurdleType,
      hurdleIrr: hurdleType === 'irr' ? hurdle : null,
      hurdleEquityMultiple: hurdleType === 'equity_multiple' ? hurdle : null,
      promotePct: finite(`promote tier ${index + 1} promote`, tier.promotePct, 0, 1),
    }
  })
}

function distributionToReachIrr(cashflows, dates, currentIndex, annualRate) {
  if (annualRate <= -1 || currentIndex <= 0) return 0
  const start = dates[0].getTime()
  const priorNpv = cashflows.reduce((sum, cashflow, index) => {
    const years = (dates[index].getTime() - start) / (365 * 24 * 60 * 60 * 1000)
    return sum + cashflow / ((1 + annualRate) ** years)
  }, 0)
  const currentYears = (dates[currentIndex].getTime() - start) / (365 * 24 * 60 * 60 * 1000)
  return Math.max(0, -priorNpv * ((1 + annualRate) ** currentYears))
}

function allocateWaterfall(projectCashflows, dates, config) {
  const initialEquity = Math.abs(Math.min(0, projectCashflows[0]))
  const lpShare = finite('LP equity share', config.lpEquityShare, 0, 1)
  const gpShare = 1 - lpShare
  const lpCashflows = [projectCashflows[0] * lpShare]
  const gpCashflows = [projectCashflows[0] * gpShare]
  let lpCapital = initialEquity * lpShare
  let gpCapital = initialEquity * gpShare
  let lpPref = 0
  let cumulativeProjectDistributions = 0
  const monthlyPrefRate = (1 + config.preferredReturn) ** (1 / 12) - 1
  const promoteTiers = normalizedPromoteTiers(config)

  for (let month = 1; month < projectCashflows.length; month += 1) {
    const cashflow = projectCashflows[month]
    lpPref += lpCapital * monthlyPrefRate
    if (cashflow < 0) {
      const contribution = Math.abs(cashflow)
      lpCapital += contribution * lpShare
      gpCapital += contribution * gpShare
      lpCashflows.push(-contribution * lpShare)
      gpCashflows.push(-contribution * gpShare)
      continue
    }
    let available = cashflow
    let lpDistribution = 0
    let gpDistribution = 0
    const capitalReturn = Math.min(available, lpCapital + gpCapital)
    const totalCapital = lpCapital + gpCapital
    const lpCapitalReturn = totalCapital ? capitalReturn * (lpCapital / totalCapital) : 0
    const gpCapitalReturn = capitalReturn - lpCapitalReturn
    lpCapital -= lpCapitalReturn
    gpCapital -= gpCapitalReturn
    lpDistribution += lpCapitalReturn
    gpDistribution += gpCapitalReturn
    available -= capitalReturn

    const prefPaid = Math.min(available, lpPref)
    lpDistribution += prefPaid
    lpPref -= prefPaid
    available -= prefPaid

    if (available > 0 && config.gpCatchUpPct > 0 && config.promotePct > 0) {
      const targetCatchUp = prefPaid * config.promotePct / Math.max(0.0001, 1 - config.promotePct)
      const catchUp = Math.min(available, targetCatchUp * config.gpCatchUpPct)
      gpDistribution += catchUp
      available -= catchUp
    }

    if (available > 0) {
      for (const tier of promoteTiers) {
        if (available <= 0) break
        const distributedThisMonth = lpDistribution + gpDistribution
        let capacity = available
        if (tier.hurdleType === 'irr' && tier.hurdleIrr != null) {
          const lpNeeded = Math.max(0, distributionToReachIrr(lpCashflows, dates, month, tier.hurdleIrr) - lpDistribution)
          capacity = lpNeeded / Math.max(0.0001, 1 - tier.promotePct)
        } else if (tier.hurdleEquityMultiple != null) {
          capacity = Math.max(0, initialEquity * tier.hurdleEquityMultiple - cumulativeProjectDistributions - distributedThisMonth)
        }
        const tierCash = Math.min(available, capacity)
        lpDistribution += tierCash * (1 - tier.promotePct)
        gpDistribution += tierCash * tier.promotePct
        available -= tierCash
      }
      if (available > 0) {
        const lastPromote = promoteTiers.at(-1)?.promotePct ?? 0
        lpDistribution += available * (1 - lastPromote)
        gpDistribution += available * lastPromote
      }
    }
    cumulativeProjectDistributions += cashflow
    lpCashflows.push(lpDistribution)
    gpCashflows.push(gpDistribution)
  }
  return {
    lpCashflows,
    gpCashflows,
    lpIrr: calculateXirr(lpCashflows, dates),
    gpIrr: calculateXirr(gpCashflows, dates),
    lpEquityMultiple: Math.abs(lpCashflows[0]) ? lpCashflows.slice(1).reduce((sum, value) => sum + Math.max(0, value), 0) / Math.abs(lpCashflows.filter(value => value < 0).reduce((sum, value) => sum + value, 0)) : null,
    gpEquityMultiple: Math.abs(gpCashflows[0]) ? gpCashflows.slice(1).reduce((sum, value) => sum + Math.max(0, value), 0) / Math.abs(gpCashflows.filter(value => value < 0).reduce((sum, value) => sum + value, 0)) : null,
    promoteTiers,
  }
}

function allocateWaterfallClasses(projectCashflows, dates, config) {
  if (!config.classes.length) return { ...allocateWaterfall(projectCashflows, dates, config), classes: [] }
  const classes = config.classes.map(equityClass => {
    const classCashflows = projectCashflows.map(value => value * equityClass.capitalShare)
    const allocation = allocateWaterfall(classCashflows, dates, {
      lpEquityShare: equityClass.lpEquityShare ?? config.lpEquityShare,
      preferredReturn: equityClass.preferredReturn ?? config.preferredReturn,
      gpCatchUpPct: equityClass.gpCatchUpPct ?? config.gpCatchUpPct,
      promotePct: equityClass.promotePct ?? config.promotePct,
      secondTierEquityMultiple: equityClass.secondTierEquityMultiple ?? config.secondTierEquityMultiple,
      secondTierPromotePct: equityClass.secondTierPromotePct ?? config.secondTierPromotePct,
      promoteTiers: equityClass.promoteTiers,
    })
    return { key: equityClass.key, name: equityClass.name, capitalShare: equityClass.capitalShare, classCashflows, ...allocation }
  })
  const lpCashflows = projectCashflows.map((_, index) => classes.reduce((sum, equityClass) => sum + equityClass.lpCashflows[index], 0))
  const gpCashflows = projectCashflows.map((_, index) => classes.reduce((sum, equityClass) => sum + equityClass.gpCashflows[index], 0))
  const positiveMultiple = cashflows => {
    const contributions = Math.abs(cashflows.filter(value => value < 0).reduce((sum, value) => sum + value, 0))
    return contributions ? cashflows.slice(1).reduce((sum, value) => sum + Math.max(0, value), 0) / contributions : null
  }
  return {
    lpCashflows,
    gpCashflows,
    lpIrr: calculateXirr(lpCashflows, dates),
    gpIrr: calculateXirr(gpCashflows, dates),
    lpEquityMultiple: positiveMultiple(lpCashflows),
    gpEquityMultiple: positiveMultiple(gpCashflows),
    classes,
  }
}

export function runMonthlyUnderwriting(rawInput) {
  const input = normalize(rawInput)
  const holdMonths = Math.round(input.holdPeriodYears * 12)
  const projectionMonths = holdMonths + 12
  const startDate = new Date(`${input.projectionStartDate}T00:00:00Z`)
  if (Number.isNaN(startDate.getTime())) throw new RangeError('projectionStartDate must be an ISO date')
  const dates = Array.from({ length: holdMonths + 1 }, (_, month) => addMonths(startDate, month))
  const renovationTarget = input.unitMix.reduce((sum, row) => sum + Math.min(row.units, row.unitsToRenovate ?? row.units), 0)
  const monthlyRenovationPace = input.unitsRenovatedPerMonth ?? input.unitsRenovatedPerYear / 12
  const completionQueue = Array.from({ length: projectionMonths + input.renovationDowntimeMonths + 2 }, () => 0)
  const monthly = []
  let renovatedUnits = 0
  let renovationsStarted = 0
  let acquisitionBalance = input.purchasePrice * input.ltv
  let acquisitionAge = 0
  let refiBalance = 0
  let refiAge = 0
  let constructionBalance = 0
  let operatingReserveBalance = input.operatingReserveAmount
  let accumulatedDepreciation = 0
  const acquisitionPayment = monthlyPayment(acquisitionBalance, input.interestRate, input.amortizationYears * 12)
  const drawMap = new Map(input.constructionDraws.map(draw => [Math.round(draw.month), finite('construction draw amount', draw.amount, 0)]))

  for (let month = 1; month <= projectionMonths; month += 1) {
    renovatedUnits += completionQueue[month] ?? 0
    const starts = month >= input.renovationStartMonth
      ? Math.min(renovationTarget - renovationsStarted, Math.max(0, monthlyRenovationPace))
      : 0
    renovationsStarted += starts
    completionQueue[month + Math.round(input.renovationDowntimeMonths)] += starts
    const offlineUnits = completionQueue.slice(month + 1, month + Math.round(input.renovationDowntimeMonths) + 1).reduce((sum, value) => sum + value, 0)
    const monthlyInPlaceGrowth = (1 + input.rentGrowthInPlace) ** (1 / 12) - 1
    const monthlyRenovatedGrowth = (1 + input.rentGrowthRenovated) ** (1 / 12) - 1
    const currentRent = input.unitMix.reduce((sum, row) => sum + row.units * row.currentRent, 0) / input.totalUnits * ((1 + monthlyInPlaceGrowth) ** (month - 1))
    const marketRent = input.unitMix.reduce((sum, row) => sum + row.units * (row.marketRent + (row.renovationPremium ?? 0)), 0) / input.totalUnits * ((1 + monthlyRenovatedGrowth) ** (month - 1))
    const inPlaceUnits = Math.max(0, input.totalUnits - renovatedUnits - offlineUnits)
    const grossPotentialRent = inPlaceUnits * currentRent + renovatedUnits * marketRent
    const effectiveRent = grossPotentialRent * (1 - input.vacancyPct)
    const otherIncome = input.otherIncome / 12 * ((1 + input.otherIncomeGrowth) ** ((month - 1) / 12))
    const expenseGrowth = (1 + input.expenseGrowth) ** ((month - 1) / 12)
    let annualPropertyTaxes = input.propertyTaxes * ((1 + input.propertyTaxGrowth) ** ((month - 1) / 12))
    if (input.propertyTaxReassessmentMonth > 0 && month >= input.propertyTaxReassessmentMonth && input.reassessedAnnualPropertyTaxes != null) {
      annualPropertyTaxes = input.reassessedAnnualPropertyTaxes * ((1 + input.propertyTaxGrowth) ** ((month - input.propertyTaxReassessmentMonth) / 12))
    }
    const controllableExpenses = (input.payroll + input.repairsMaintenance + input.contractServices + input.marketing + input.administration + input.utilities) / 12 * expenseGrowth
    const insurance = input.insurance / 12 * expenseGrowth
    const managementFee = (effectiveRent + otherIncome) * input.propertyMgmtFeePct
    const reserves = input.replacementReservesPerUnit * input.totalUnits / 12 * expenseGrowth
    const noi = effectiveRent + otherIncome - controllableExpenses - annualPropertyTaxes / 12 - insurance - managementFee - reserves
    const renovationCapex = starts * input.renovationCostPerUnit
    const scheduledOtherCapex = month === Math.round(input.otherCapexTimingYear * 12) ? input.otherCapex : 0
    const constructionDraw = drawMap.get(month) ?? 0
    const debtFundedDraw = constructionDraw * input.constructionLoanPct
    constructionBalance += debtFundedDraw
    const equityFundedDraw = constructionDraw - debtFundedDraw
    const constructionInterest = constructionBalance * input.constructionLoanInterestRate / 12

    let debtInterest = 0
    let debtPrincipal = 0
    let debtService = 0
    let refinanceProceeds = 0
    let refinanceCosts = 0
    if (month <= holdMonths) {
      if (refiBalance > 0) {
        const interest = refiBalance * input.refinanceInterestRate / 12
        const payment = refiAge < input.refinanceInterestOnlyMonths ? interest : monthlyPayment(refiBalance, input.refinanceInterestRate, input.refinanceAmortizationYears * 12)
        debtPrincipal = Math.min(refiBalance, Math.max(0, payment - interest))
        debtInterest = interest
        debtService = interest + debtPrincipal
        refiBalance -= debtPrincipal
        refiAge += 1
      } else {
        const interest = acquisitionBalance * input.interestRate / 12
        const payment = acquisitionAge < input.interestOnlyMonths ? interest : acquisitionPayment
        debtPrincipal = Math.min(acquisitionBalance, Math.max(0, payment - interest))
        debtInterest = interest
        debtService = interest + debtPrincipal
        acquisitionBalance -= debtPrincipal
        acquisitionAge += 1
      }
    }
    if (input.refinanceEnabled && month === Math.round(input.refinanceMonth)) {
      const trailingNoi = monthly.slice(Math.max(0, month - 12), month).reduce((sum, row) => sum + row.noi, 0) || noi * 12
      const value = trailingNoi / (input.refinanceCapRate ?? input.exitCapRate)
      const ltvLimit = value * input.refinanceLtv
      const debtConstant = monthlyPayment(1, input.refinanceInterestRate, input.refinanceAmortizationYears * 12) * 12
      const dscrLimit = debtConstant > 0 ? trailingNoi / input.refinanceMinDscr / debtConstant : ltvLimit
      refiBalance = Math.max(0, Math.min(ltvLimit, dscrLimit))
      refinanceCosts = refiBalance * input.refinanceCostsPct
      refinanceProceeds = refiBalance - acquisitionBalance - constructionBalance - refinanceCosts
      acquisitionBalance = 0
      constructionBalance = 0
      refiAge = 0
    }
    const depreciableBasis = input.purchasePrice * (1 - input.landValuePct)
    const depreciation = depreciableBasis / input.depreciationYears / 12
    accumulatedDepreciation += month <= holdMonths ? depreciation : 0
    const taxableIncome = noi - debtInterest - constructionInterest - depreciation
    const incomeTax = month <= holdMonths ? Math.max(0, taxableIncome) * input.incomeTaxRate : 0
    const capex = renovationCapex + scheduledOtherCapex + equityFundedDraw
    const preReserveCashFlow = noi - debtService - constructionInterest - capex - incomeTax + refinanceProceeds
    const leaseUpDeficit = month <= holdMonths ? Math.max(0, -preReserveCashFlow) : 0
    const operatingReserveDraw = month <= holdMonths ? Math.min(operatingReserveBalance, leaseUpDeficit) : 0
    operatingReserveBalance -= operatingReserveDraw
    monthly.push({
      month, date: addMonths(startDate, month).toISOString(), inPlaceUnits, renovatedUnits, offlineUnits,
      grossPotentialRent, effectiveRevenue: effectiveRent + otherIncome, operatingExpenses: effectiveRent + otherIncome - noi,
      noi, renovationCapex, constructionDraw, debtFundedDraw, equityFundedDraw, constructionInterest,
      debtInterest, debtPrincipal, debtService, acquisitionBalance, refiBalance, constructionBalance,
      refinanceProceeds, refinanceCosts, depreciation, incomeTax, capex,
      preReserveCashFlow, leaseUpDeficit, operatingReserveDraw, operatingReserveBalance,
      cashFlowBeforeSale: preReserveCashFlow + operatingReserveDraw,
    })
  }

  const operatingMonths = monthly.slice(0, holdMonths)
  const forwardNoi = monthly.slice(holdMonths, holdMonths + 12).reduce((sum, row) => sum + row.noi, 0)
  const trailingNoi = monthly.slice(holdMonths - 12, holdMonths).reduce((sum, row) => sum + row.noi, 0)
  const exitNoi = input.exitNoiConvention === 'trailing' ? trailingNoi : forwardNoi
  const grossExitValue = exitNoi / input.exitCapRate
  const netSaleBeforeDebt = grossExitValue * (1 - input.saleCostsPct)
  const remainingDebt = acquisitionBalance + refiBalance + constructionBalance
  const adjustedBasis = input.purchasePrice + operatingMonths.reduce((sum, row) => sum + row.renovationCapex + row.constructionDraw, 0) - accumulatedDepreciation
  const taxableGain = Math.max(0, netSaleBeforeDebt - adjustedBasis)
  const recaptureTax = Math.min(accumulatedDepreciation, taxableGain) * input.depreciationRecaptureTaxRate
  const capitalGainsTax = Math.max(0, taxableGain - accumulatedDepreciation) * input.capitalGainsTaxRate
  const operatingReserveRelease = operatingReserveBalance
  const netSaleProceeds = netSaleBeforeDebt - remainingDebt - recaptureTax - capitalGainsTax + operatingReserveRelease
  const closingCosts = input.purchasePrice * input.closingCostsPct
  const initialEquity = input.purchasePrice * (1 - input.ltv) + closingCosts + input.upfrontCapexReserve + input.operatingReserveAmount
  const projectCashflows = [-initialEquity, ...operatingMonths.map(row => row.cashFlowBeforeSale)]
  projectCashflows[projectCashflows.length - 1] += netSaleProceeds
  const positiveDistributions = projectCashflows.slice(1).reduce((sum, value) => sum + Math.max(0, value), 0)
  const totalContributions = Math.abs(projectCashflows.filter(value => value < 0).reduce((sum, value) => sum + value, 0))
  const waterfall = input.waterfall.enabled ? allocateWaterfallClasses(projectCashflows, dates, input.waterfall) : null
  const noiByYear = annualize(operatingMonths.map(row => row.noi), input.holdPeriodYears)
  const debtServiceByYear = annualize(operatingMonths.map(row => row.debtService + row.constructionInterest), input.holdPeriodYears)

  return {
    modelVersion: ADVANCED_UNDERWRITING_MODEL_VERSION,
    monthly,
    projectCashflows,
    leveredIrr: calculateXirr(projectCashflows, dates),
    equityMultiple: totalContributions ? positiveDistributions / totalContributions : null,
    averageCashOnCash: initialEquity ? operatingMonths.reduce((sum, row) => sum + row.cashFlowBeforeSale, 0) / input.holdPeriodYears / initialEquity : null,
    yearOneDscr: debtServiceByYear[0] ? noiByYear[0] / debtServiceByYear[0] : null,
    totalEquityInvested: totalContributions,
    goingInCapRate: noiByYear[0] / input.purchasePrice,
    grossExitValue,
    netSaleProceeds,
    loanBalanceAtExit: remainingDebt,
    exitNoi,
    noiByYear,
    debtServiceByYear,
    cashFlowBeforeTax: annualize(operatingMonths.map(row => row.cashFlowBeforeSale), input.holdPeriodYears),
    capexByYear: annualize(operatingMonths.map(row => row.capex), input.holdPeriodYears),
    leaseUpDeficitByYear: annualize(operatingMonths.map(row => row.leaseUpDeficit), input.holdPeriodYears),
    operatingReserve: {
      initial: input.operatingReserveAmount,
      drawn: operatingMonths.reduce((sum, row) => sum + row.operatingReserveDraw, 0),
      releasedAtExit: operatingReserveRelease,
      endingBalanceBeforeRelease: operatingReserveBalance,
    },
    refinance: input.refinanceEnabled ? {
      month: input.refinanceMonth,
      proceeds: operatingMonths.find(row => row.month === Math.round(input.refinanceMonth))?.refinanceProceeds ?? 0,
      endingBalance: refiBalance,
    } : null,
    taxes: { incomeTax: operatingMonths.reduce((sum, row) => sum + row.incomeTax, 0), capitalGainsTax, recaptureTax, accumulatedDepreciation },
    waterfall,
    warnings: [
      'Monthly projections use aggregate unit turnover rather than individual lease expirations.',
      'Tax outputs are estimates and are not tax advice; entity and investor-specific attributes are not modeled.',
      'Waterfall outputs use European whole-fund return-of-capital, LP preferred return, GP catch-up, and configurable class-level promote tiers.',
      'Construction draws model scheduled capital funding and interest but not retainage, lender inspections, or mechanics liens.',
      'Operating reserves fund modeled monthly deficits until exhausted; any unused balance is released at exit.',
    ],
  }
}
