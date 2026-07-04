'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { approveUnderwritingPreflight, approveUnderwritingRiskReview, prepareUnderwritingAssumptionReview, processNextUnderwritingStep, reviewUnderwritingAssumption, startUnderwritingPreflight } from '@/lib/actions/underwriting-room'
import type { UnderwritingAssumption, UnderwritingRun, UnderwritingStep } from '@/lib/types/database'

type Props = {
  dealId: string
  initialRun: UnderwritingRun | null
  initialSteps: UnderwritingStep[]
  initialAssumptions: UnderwritingAssumption[]
}

const statusCopy: Record<UnderwritingStep['status'], string> = {
  queued: 'Queued',
  running: 'Running',
  needs_review: 'Review',
  completed: 'Complete',
  failed: 'Failed',
  canceled: 'Canceled',
}

function artifactEntries(step: UnderwritingStep | undefined): Array<[string, string]> {
  if (!step?.artifact || typeof step.artifact !== 'object' || Array.isArray(step.artifact)) return []
  return Object.entries(step.artifact).slice(0, 5).map(([key, value]) => {
    if (Array.isArray(value)) {
      if (!value.length) return [key, 'None']
      const labels = value.slice(0, 5).map((item) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const record = item as Record<string, unknown>
          return String(record.label ?? record.title ?? record.name ?? record.key ?? 'Structured item')
        }
        return String(item)
      })
      return [key, `${labels.join(', ')}${value.length > 5 ? ` +${value.length - 5}` : ''}`]
    }
    if (value && typeof value === 'object') return [key, 'Structured record']
    if (typeof value === 'boolean') return [key, value ? 'Yes' : 'No']
    return [key, value === null ? 'Missing' : String(value)]
  })
}

function assumptionValue(assumption: UnderwritingAssumption) {
  const value = Number(assumption.value)
  if (!Number.isFinite(value)) return 'Missing'
  if (assumption.unit === '%') return `${(value * 100).toFixed(2).replace(/\.00$/, '')}%`
  if (assumption.unit === '$/unit') return `$${value.toLocaleString()}/unit`
  return `${value}${assumption.unit ? ` ${assumption.unit}` : ''}`
}

function assumptionInputValue(assumption: UnderwritingAssumption) {
  const value = Number(assumption.value)
  if (!Number.isFinite(value)) return ''
  return String(assumption.unit === '%' ? value * 100 : value)
}

function artifactRecord(step: UnderwritingStep | undefined): Record<string, unknown> {
  return step?.artifact && typeof step.artifact === 'object' && !Array.isArray(step.artifact)
    ? step.artifact as Record<string, unknown>
    : {}
}

type RiskScore = { name: string; score: number; notes: string }

function riskScores(step: UnderwritingStep | undefined): RiskScore[] {
  const raw = artifactRecord(step).low_scores
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const record = item as Record<string, unknown>
    const criteria = record.scoring_criteria && typeof record.scoring_criteria === 'object' && !Array.isArray(record.scoring_criteria)
      ? record.scoring_criteria as Record<string, unknown>
      : {}
    const score = Number(record.score)
    if (!Number.isFinite(score)) return []
    return [{ name: String(criteria.name ?? 'Scoring criterion'), score, notes: String(record.notes ?? 'No supporting note.') }]
  })
}

export default function UnderwritingRoom({ dealId, initialRun, initialSteps, initialAssumptions }: Props) {
  const router = useRouter()
  const [run, setRun] = useState(initialRun)
  const [steps, setSteps] = useState(initialSteps)
  const [assumptions, setAssumptions] = useState(initialAssumptions)
  const [working, setWorking] = useState(false)
  const [reviewingId, setReviewingId] = useState('')
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(initialSteps[0]?.id ?? '')
  const initialRiskStep = initialSteps.find((step) => step.step_key === 'risk_review')
  const [riskNarrative, setRiskNarrative] = useState(() => String(artifactRecord(initialRiskStep).risk_note ?? ''))
  const [revisions, setRevisions] = useState<Record<string, string>>(() => Object.fromEntries(
    initialAssumptions.map((assumption) => [assumption.id, assumptionInputValue(assumption)]),
  ))

  const completedCount = steps.filter((step) => step.status === 'completed').length
  const reviewCount = steps.filter((step) => step.status === 'needs_review').length
  const finishedCount = completedCount + reviewCount
  const clearProgress = steps.length ? Math.round((completedCount / steps.length) * 100) : 0
  const reviewProgress = steps.length ? Math.round((reviewCount / steps.length) * 100) : 0
  const selected = useMemo(
    () => steps.find((step) => step.id === selectedId) ?? steps.find((step) => step.status === 'running') ?? steps[0],
    [selectedId, steps],
  )
  const selectedRiskScores = useMemo(() => riskScores(selected), [selected])

  async function processRun(runId: string, startingSteps: UnderwritingStep[]) {
    setWorking(true)
    setError('')
    let current = startingSteps

    for (let iteration = 0; iteration < 12; iteration += 1) {
      const next = current.find((step) => step.status === 'queued')
        ?? current.find((step) => step.status === 'failed' && step.attempts < 3)
      if (!next) break
      setSelectedId(next.id)
      setSteps(current.map((step) => step.id === next.id ? { ...step, status: 'running' } : step))

      const result = await processNextUnderwritingStep(runId)
      if (result.error) {
        setError(result.error)
        break
      }
      if (result.run) setRun(result.run)
      if (result.assumptions) {
        setAssumptions(result.assumptions)
        setRevisions((current) => ({
          ...Object.fromEntries(result.assumptions!.map((assumption) => [assumption.id, assumptionInputValue(assumption)])),
          ...current,
        }))
      }
      current = result.steps ?? current
      setSteps(current)
    }
    setWorking(false)
  }

  async function start() {
    if (working) return
    setError('')
    const result = await startUnderwritingPreflight(dealId, crypto.randomUUID())
    if (result.error || !result.run) {
      setError(result.error ?? 'Could not start preflight.')
      return
    }
    const createdSteps = result.steps ?? []
    setRun(result.run)
    setSteps(createdSteps)
    setAssumptions(result.assumptions ?? [])
    setSelectedId(createdSteps[0]?.id ?? '')
    await processRun(result.run.id, createdSteps)
  }

  async function resume() {
    if (!run || working) return
    await processRun(run.id, steps)
  }

  async function openStep(step: UnderwritingStep) {
    setSelectedId(step.id)
    if (step.step_key !== 'assumption_review' || assumptions.length || !run || reviewingId) return
    setReviewingId('loading')
    setError('')
    const result = await prepareUnderwritingAssumptionReview(run.id)
    if (result.error) setError(result.error)
    if (result.assumptions) {
      setAssumptions(result.assumptions)
      setRevisions((current) => ({
        ...current,
        ...Object.fromEntries(result.assumptions!.map((item) => [item.id, assumptionInputValue(item)])),
      }))
    }
    if (result.step) setSteps((current) => current.map((item) => item.id === result.step!.id ? result.step! : item))
    setReviewingId('')
  }

  function focusReview() {
    const firstReview = steps.find((step) => step.step_key === 'assumption_review' && step.status === 'needs_review')
      ?? steps.find((step) => step.status === 'needs_review')
    if (firstReview) void openStep(firstReview)
  }

  async function decideAssumption(assumption: UnderwritingAssumption, decision: 'approved' | 'rejected' | 'revised') {
    if (!run || reviewingId) return
    setReviewingId(assumption.id)
    setError('')
    const enteredValue = Number(revisions[assumption.id])
    const revisedValue = decision === 'revised'
      ? assumption.unit === '%' ? enteredValue / 100 : enteredValue
      : undefined
    const result = await reviewUnderwritingAssumption(run.id, assumption.id, decision, revisedValue)
    if (result.error) setError(result.error)
    if (result.run) setRun(result.run)
    if (result.steps) setSteps(result.steps)
    if (result.assumptions) {
      setAssumptions(result.assumptions)
      setRevisions((current) => ({
        ...current,
        ...Object.fromEntries(result.assumptions!.map((item) => [item.id, assumptionInputValue(item)])),
      }))
    }
    setReviewingId('')
  }

  async function approveRisk() {
    if (!run || working) return
    setWorking(true)
    setError('')
    const result = await approveUnderwritingRiskReview(run.id, riskNarrative)
    if (result.error) setError(result.error)
    if (result.run) setRun(result.run)
    if (result.steps) setSteps(result.steps)
    setWorking(false)
  }

  async function finalizePreflight() {
    if (!run || working || run.approved_at) return
    setWorking(true)
    setError('')
    const result = await approveUnderwritingPreflight(run.id)
    if (result.error) setError(result.error)
    if (result.run) setRun(result.run)
    if (result.steps) setSteps(result.steps)
    if (result.run?.approved_at) router.refresh()
    setWorking(false)
  }

  function openBlocker(label: string) {
    if (label === 'Risk narrative') {
      const step = steps.find((item) => item.step_key === 'risk_review')
      if (step) void openStep(step)
      return
    }
    if (label.includes('underwriting assumption')) {
      const step = steps.find((item) => item.step_key === 'assumption_review')
      if (step) void openStep(step)
    }
  }

  const canResume = Boolean(run && steps.some((step) => step.status === 'queued' || (step.status === 'failed' && step.attempts < 3)))
  const isApproved = Boolean(run?.approved_at && run.status === 'completed')
  const reviewSteps = steps.filter((step) => step.status === 'needs_review')
  const onlyIcReadinessNeedsReview = reviewSteps.length === 1 && reviewSteps[0]?.step_key === 'ic_readiness'
  const canFinalize = Boolean(run && !canResume && reviewCount === 0 && !isApproved)
  const primaryAction = canResume ? resume : onlyIcReadinessNeedsReview ? finalizePreflight : reviewCount ? focusReview : canFinalize ? finalizePreflight : start
  const primaryLabel = working
    ? 'Workstreams running…'
    : canResume
      ? 'Resume preflight'
      : onlyIcReadinessNeedsReview
        ? 'Recheck & lock package'
      : reviewCount
        ? `Review ${reviewCount} workstream${reviewCount === 1 ? '' : 's'}`
        : isApproved
          ? 'Preflight approved'
          : canFinalize
            ? 'Approve preflight'
        : run
          ? 'Run fresh preflight'
          : 'Start preflight'

  return (
    <section className="app-agent-room">
      <div className="app-agent-room-header">
        <div>
          <p>Full Underwrite <span>Preflight</span></p>
          <h2>Underwriting Room</h2>
          <small>Inspectable workstreams prepare the deal for document extraction, market verification, and analyst approval.</small>
        </div>
        <div className="app-agent-room-actions">
          <button className="btn-primary" onClick={primaryAction} disabled={working || isApproved}>{primaryLabel}</button>
          {run && reviewCount > 0 && !canResume && (
            <button className="app-agent-rerun" onClick={start} disabled={working}>Run fresh preflight</button>
          )}
        </div>
      </div>

      <div className="app-agent-progress">
        <div className="app-agent-progress-copy">
          <strong>{steps.length ? `${completedCount} complete · ${reviewCount} review` : 'Not started'}</strong>
          <span>{isApproved ? 'Approved package locked for the next underwriting phase' : run?.status === 'needs_review' ? 'Preflight finished — analyst action required' : working ? `${finishedCount} of ${steps.length} workstreams finished` : 'No credits consumed during preflight'}</span>
        </div>
        <div className="app-agent-progress-track">
          <span className="clear" style={{ width: `${clearProgress}%` }} />
          <span className="review" style={{ width: `${reviewProgress}%` }} />
        </div>
        <strong>{reviewCount ? `${reviewCount} flagged` : `${clearProgress}%`}</strong>
      </div>

      {error && <p className="app-uw-error" role="alert">{error}</p>}

      <div className="app-agent-room-body">
        <div className="app-agent-grid" aria-label="Underwriting workstreams">
          {steps.length ? steps.map((step) => (
            <button
              key={step.id}
              type="button"
              className="app-agent-step"
              data-status={step.status}
              data-selected={selected?.id === step.id}
              onClick={() => void openStep(step)}
            >
              <span className="app-agent-step-index">{String(step.position + 1).padStart(2, '0')}</span>
              <div>
                <div className="app-agent-step-title">
                  <strong>{step.label}</strong>
                  <span>{statusCopy[step.status]}</span>
                </div>
                <p>{step.artifact_summary ?? (step.status === 'running' ? 'Inspecting firm records…' : 'Waiting for prior workstreams')}</p>
                {(step.evidence_count > 0 || step.confidence !== null) && (
                  <small>
                    {step.evidence_count} evidence item{step.evidence_count === 1 ? '' : 's'}
                    {step.confidence !== null ? ` · ${Math.round(step.confidence * 100)}% confidence` : ''}
                  </small>
                )}
              </div>
            </button>
          )) : (
            <div className="app-agent-empty">
              <span>08</span>
              <strong>Eight workstreams are ready</strong>
              <p>Start preflight to inventory the deal, connect its financial baseline, search firm memory, and identify approval gaps.</p>
            </div>
          )}
        </div>

        <aside className="app-agent-inspector">
          <div className="app-agent-inspector-heading">
            <p>Live artifact</p>
            <span>{selected ? statusCopy[selected.status] : 'Waiting'}</span>
          </div>
          {selected?.step_key === 'risk_review' ? (
            <div className="app-risk-review">
              <h3>Risk narrative</h3>
              <p>Document the principal downside risks, evidence, and mitigants before approving this workstream.</p>
              {selectedRiskScores.length > 0 && (
                <div className="app-risk-evidence">
                  {selectedRiskScores.map((item) => (
                    <article key={item.name}>
                      <div><strong>{item.name}</strong><span>{item.score}/5</span></div>
                      <p>{item.notes}</p>
                    </article>
                  ))}
                </div>
              )}
              <textarea
                value={riskNarrative}
                onChange={(event) => setRiskNarrative(event.target.value)}
                placeholder="Example: Current rents require verification against the rent roll; downside assumes slower lease trade-outs…"
                rows={10}
              />
              <div className="app-risk-review-footer">
                <span>{riskNarrative.trim().length} characters</span>
                <button type="button" onClick={approveRisk} disabled={working}>Save & approve risk review</button>
              </div>
            </div>
          ) : selected?.step_key === 'ic_readiness' ? (
            <div className="app-ic-review">
              <h3>IC readiness</h3>
              {Array.isArray(artifactRecord(selected).missing) && (artifactRecord(selected).missing as unknown[]).length ? (
                <>
                  <p>Resolve these blockers before the reviewed package can be locked.</p>
                  <div className="app-ic-blockers">
                    {(artifactRecord(selected).missing as unknown[]).map((item) => {
                      const label = String(item)
                      const href = label === 'Deal documents' ? '#section-files'
                        : label === 'Investment thesis' ? '#section-notes'
                          : label === 'Quick Pencil' ? '#section-underwriting'
                            : ''
                      return href ? (
                        <a href={href} key={label}><span>{label}</span><strong>Open →</strong></a>
                      ) : (
                        <button type="button" onClick={() => openBlocker(label)} key={label}><span>{label}</span><strong>Review →</strong></button>
                      )
                    })}
                  </div>
                  <div className="app-ic-ready">
                    <p>Already resolved a blocker? Recheck the live deal record and lock the package when every requirement is present.</p>
                    <button type="button" onClick={finalizePreflight} disabled={working || isApproved}>
                      {working ? 'Rechecking...' : 'Recheck & lock package'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="app-ic-ready">
                  <span>Ready</span>
                  <p>All required records and analyst approvals are present. Final approval locks this exact preflight package.</p>
                  <button type="button" onClick={finalizePreflight} disabled={working || isApproved}>{isApproved ? 'Preflight approved' : 'Approve & lock package'}</button>
                </div>
              )}
            </div>
          ) : selected?.step_key === 'assumption_review' && reviewingId === 'loading' ? (
            <div className="app-agent-inspector-placeholder">
              <span />
              <p>Preparing the durable assumption review…</p>
            </div>
          ) : selected?.step_key === 'assumption_review' && assumptions.length ? (
            <div className="app-assumption-review">
              <div className="app-assumption-review-summary">
                <h3>Screening assumptions</h3>
                <p>{assumptions.filter((item) => item.approval_status !== 'approved').length} require a decision before IC readiness.</p>
              </div>
              <div className="app-assumption-list">
                {assumptions.map((assumption) => (
                  <div className="app-assumption-item" data-status={assumption.approval_status} key={assumption.id}>
                    <div className="app-assumption-item-heading">
                      <div>
                        <strong>{assumption.label}</strong>
                        <small>{assumption.source_reference ?? 'No source'} · {Math.round((assumption.confidence ?? 0) * 100)}% confidence</small>
                      </div>
                      <span>{assumption.approval_status.replace('_', ' ')}</span>
                    </div>
                    <div className="app-assumption-value">
                      <span>{assumptionValue(assumption)}</span>
                      <div>
                        <input
                          aria-label={`Revised ${assumption.label}`}
                          inputMode="decimal"
                          value={revisions[assumption.id] ?? ''}
                          onChange={(event) => setRevisions((current) => ({ ...current, [assumption.id]: event.target.value }))}
                        />
                        <small>Edit in {assumption.unit === '%' ? 'percent' : assumption.unit ?? 'model units'}</small>
                      </div>
                    </div>
                    <div className="app-assumption-actions">
                      <button type="button" onClick={() => decideAssumption(assumption, 'approved')} disabled={reviewingId === assumption.id}>Approve</button>
                      <button type="button" onClick={() => decideAssumption(assumption, 'revised')} disabled={reviewingId === assumption.id}>Save revision</button>
                      <button type="button" className="danger" onClick={() => decideAssumption(assumption, 'rejected')} disabled={reviewingId === assumption.id}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : selected ? (
            <>
              <h3>{selected.label}</h3>
              <p>{selected.artifact_summary ?? 'This artifact will appear as soon as the workstream completes.'}</p>
              <dl>
                {artifactEntries(selected).map(([key, value]) => (
                  <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{value}</dd></div>
                ))}
              </dl>
              {selected.error_message && <div className="app-agent-inspector-error">{selected.error_message}</div>}
            </>
          ) : (
            <div className="app-agent-inspector-placeholder">
              <span />
              <p>Structured findings, evidence counts, confidence, and exceptions will appear here.</p>
            </div>
          )}
        </aside>
      </div>

      <footer className="app-agent-room-footer">
        <span>Truthful progress only</span>
        <p>Preflight reads existing Dealstash records. Later AI steps will show cited evidence and provider usage separately.</p>
      </footer>
    </section>
  )
}
