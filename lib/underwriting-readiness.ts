import type { UnderwritingAssumption, UnderwritingRun, UnderwritingStep } from '@/lib/types/database'

type NoteLike = { section: string | null; content: string | null }
type FileLike = { id?: string | null }

export type UnderwritingReadinessItem = {
  key: string
  label: string
  complete: boolean
  helper: string
}

export type UnderwritingHealthStatus = 'not_started' | 'locked' | 'running' | 'needs_review' | 'approved' | 'completed' | 'failed'

export type UnderwritingReadiness = {
  preflightStatus: UnderwritingHealthStatus
  preflightLabel: string
  fullStatus: UnderwritingHealthStatus
  fullLabel: string
  lastUpdatedAt: string | null
  supportCode: string | null
  failureTitle: string | null
  failureMessage: string | null
  retryCopy: string | null
  nextAction: string
  readyCount: number
  totalCount: number
  items: UnderwritingReadinessItem[]
}

export type UnderwritingReadinessInput = {
  notes: NoteLike[]
  files: FileLike[]
  quickRuns: UnderwritingRun[]
  preflightRun: UnderwritingRun | null
  preflightSteps: UnderwritingStep[]
  preflightAssumptions: UnderwritingAssumption[]
  fullRun: UnderwritingRun | null
  fullSteps: UnderwritingStep[]
}

function hasNote(notes: NoteLike[], section: string) {
  return notes.some((note) => note.section === section && Boolean(note.content?.trim()))
}

function hasCompletedRun(runs: UnderwritingRun[]) {
  return runs.some((run) => run.status === 'completed')
}

function allReviewed(assumptions: UnderwritingAssumption[]) {
  return assumptions.length > 0 && assumptions.every((item) => item.approval_status === 'approved')
}

function failingStep(steps: UnderwritingStep[]) {
  return steps.find((step) => step.status === 'failed') ?? null
}

export function underwritingSupportCode(run: UnderwritingRun | null) {
  if (!run?.id) return null
  return `UW-${run.id.replace(/-/g, '').slice(0, 10).toUpperCase()}`
}

function preflightStatus(run: UnderwritingRun | null): [UnderwritingHealthStatus, string] {
  if (!run) return ['not_started', 'Not started']
  if (run.status === 'failed') return ['failed', 'Issue found']
  if (run.status === 'running' || run.status === 'queued') return ['running', 'Running']
  if (run.status === 'needs_review' || run.assumption_status === 'needs_review') return ['needs_review', 'Needs review']
  if (run.status === 'completed' && run.approved_at) return ['approved', 'Approved']
  if (run.status === 'completed') return ['needs_review', 'Needs lock']
  return ['not_started', 'Not started']
}

function fullStatus(preflight: UnderwritingRun | null, run: UnderwritingRun | null): [UnderwritingHealthStatus, string] {
  const preflightApproved = Boolean(preflight?.approved_at && preflight.status === 'completed')
  if (!preflightApproved) return ['locked', 'Locked']
  if (!run) return ['not_started', 'Ready to run']
  if (run.status === 'failed') return ['failed', 'Issue found']
  if (run.status === 'running' || run.status === 'queued') return ['running', 'Running']
  if (run.status === 'needs_review' || run.assumption_status === 'needs_review') return ['needs_review', 'Needs review']
  if (run.status === 'completed') return ['completed', 'Complete']
  return ['not_started', 'Ready to run']
}

function latestDate(values: Array<string | null | undefined>) {
  const dates = values.filter(Boolean).map((value) => new Date(String(value))).filter((date) => Number.isFinite(date.getTime()))
  if (!dates.length) return null
  return new Date(Math.max(...dates.map((date) => date.getTime()))).toISOString()
}

export function buildUnderwritingReadiness(input: UnderwritingReadinessInput): UnderwritingReadiness {
  const [preflightKey, preflightLabel] = preflightStatus(input.preflightRun)
  const [fullKey, fullLabel] = fullStatus(input.preflightRun, input.fullRun)
  const failedRun = input.fullRun?.status === 'failed' ? input.fullRun : input.preflightRun?.status === 'failed' ? input.preflightRun : null
  const failedStep = failedRun?.run_type === 'full_underwrite' ? failingStep(input.fullSteps) : failingStep(input.preflightSteps)
  const supportCode = underwritingSupportCode(failedRun)
  const quickComplete = hasCompletedRun(input.quickRuns)
  const thesisPresent = hasNote(input.notes, 'overview')
  const riskPresent = hasNote(input.notes, 'risks')
  const docsPresent = input.files.length > 0
  const assumptionsApproved = input.preflightRun?.assumption_status === 'approved' || allReviewed(input.preflightAssumptions)
  const preflightLocked = Boolean(input.preflightRun?.approved_at && input.preflightRun.status === 'completed')
  const fullComplete = input.fullRun?.status === 'completed'
  const icMemoGenerated = fullComplete

  const items: UnderwritingReadinessItem[] = [
    { key: 'thesis', label: 'Investment thesis present', complete: thesisPresent, helper: thesisPresent ? 'Overview narrative is saved.' : 'Add the investment thesis in Notes.' },
    { key: 'risk', label: 'Risk narrative present', complete: riskPresent, helper: riskPresent ? 'Risk narrative is saved.' : 'Add risk narrative before IC readiness.' },
    { key: 'documents', label: 'Documents attached', complete: docsPresent, helper: docsPresent ? 'Source documents are available.' : 'Attach the OM or supporting files.' },
    { key: 'quick_pencil', label: 'Quick Pencil complete', complete: quickComplete, helper: quickComplete ? 'Screening model has a saved baseline.' : 'Run Quick Pencil to create a baseline.' },
    { key: 'assumptions', label: 'Assumptions approved', complete: assumptionsApproved, helper: assumptionsApproved ? 'Screening assumptions are approved.' : 'Approve or revise assumptions in preflight.' },
    { key: 'preflight', label: 'Preflight locked', complete: preflightLocked, helper: preflightLocked ? 'Approved package is locked.' : 'Approve and lock the preflight package.' },
    { key: 'full_underwrite', label: 'Full underwrite complete', complete: fullComplete, helper: fullComplete ? 'Execution package is complete.' : 'Run the full underwrite after preflight.' },
    { key: 'ic_memo', label: 'IC memo available', complete: icMemoGenerated, helper: icMemoGenerated ? 'IC memo can be downloaded.' : 'Complete full underwrite to generate IC output.' },
  ]

  const readyCount = items.filter((item) => item.complete).length
  const nextIncomplete = items.find((item) => !item.complete)
  const nextAction = failedRun
    ? 'Retry the run or contact support with the support code.'
    : nextIncomplete?.helper ?? 'Ready for IC review.'

  return {
    preflightStatus: preflightKey,
    preflightLabel,
    fullStatus: fullKey,
    fullLabel,
    lastUpdatedAt: latestDate([
      input.quickRuns[0]?.updated_at,
      input.preflightRun?.updated_at,
      input.fullRun?.updated_at,
      ...input.preflightSteps.map((step) => step.updated_at),
      ...input.fullSteps.map((step) => step.updated_at),
    ]),
    supportCode,
    failureTitle: failedRun ? 'This run hit an issue' : null,
    failureMessage: failedStep?.error_message ?? failedRun?.error_message ?? null,
    retryCopy: failedRun ? 'It is safe to retry from this deal. If it fails again, send support the code below so we can find the exact run.' : null,
    nextAction,
    readyCount,
    totalCount: items.length,
    items,
  }
}
