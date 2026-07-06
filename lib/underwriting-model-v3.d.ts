export const ADVANCED_UNDERWRITING_MODEL_VERSION: string

export interface AdvancedUnderwritingOutput {
  modelVersion: string
  monthly: Array<Record<string, number | string>>
  projectCashflows: number[]
  leveredIrr: number | null
  equityMultiple: number | null
  averageCashOnCash: number | null
  yearOneDscr: number | null
  totalEquityInvested: number
  goingInCapRate: number
  grossExitValue: number
  netSaleProceeds: number
  loanBalanceAtExit: number
  exitNoi: number
  noiByYear: number[]
  debtServiceByYear: number[]
  cashFlowBeforeTax: number[]
  capexByYear: number[]
  refinance: { month: number; proceeds: number; endingBalance: number } | null
  taxes: { incomeTax: number; capitalGainsTax: number; recaptureTax: number; accumulatedDepreciation: number }
  waterfall: {
    lpCashflows: number[]; gpCashflows: number[]
    lpIrr: number | null; gpIrr: number | null
    lpEquityMultiple: number | null; gpEquityMultiple: number | null
  } | null
  warnings: string[]
}

export function runMonthlyUnderwriting(input: Record<string, unknown>): AdvancedUnderwritingOutput
