'use client'

import { useMemo, useState } from 'react'
import { processNextUnderwritingStep, startUnderwritingPreflight } from '@/lib/actions/underwriting-room'
import type { UnderwritingRun, UnderwritingStep } from '@/lib/types/database'

type Props = {
  dealId: string
  initialRun: UnderwritingRun | null
  initialSteps: UnderwritingStep[]
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

export default function UnderwritingRoom({ dealId, initialRun, initialSteps }: Props) {
  const [run, setRun] = useState(initialRun)
  const [steps, setSteps] = useState(initialSteps)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(initialSteps[0]?.id ?? '')

  const completedCount = steps.filter((step) => step.status === 'completed').length
  const reviewCount = steps.filter((step) => step.status === 'needs_review').length
  const finishedCount = completedCount + reviewCount
  const clearProgress = steps.length ? Math.round((completedCount / steps.length) * 100) : 0
  const reviewProgress = steps.length ? Math.round((reviewCount / steps.length) * 100) : 0
  const selected = useMemo(
    () => steps.find((step) => step.id === selectedId) ?? steps.find((step) => step.status === 'running') ?? steps[0],
    [selectedId, steps],
  )

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
    setSelectedId(createdSteps[0]?.id ?? '')
    await processRun(result.run.id, createdSteps)
  }

  async function resume() {
    if (!run || working) return
    await processRun(run.id, steps)
  }

  function focusReview() {
    const firstReview = steps.find((step) => step.status === 'needs_review')
    if (firstReview) setSelectedId(firstReview.id)
  }

  const canResume = Boolean(run && steps.some((step) => step.status === 'queued' || (step.status === 'failed' && step.attempts < 3)))
  const primaryAction = canResume ? resume : reviewCount ? focusReview : start
  const primaryLabel = working
    ? 'Workstreams running…'
    : canResume
      ? 'Resume preflight'
      : reviewCount
        ? `Review ${reviewCount} item${reviewCount === 1 ? '' : 's'}`
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
          <button className="btn-primary" onClick={primaryAction} disabled={working}>{primaryLabel}</button>
          {run && reviewCount > 0 && !canResume && (
            <button className="app-agent-rerun" onClick={start} disabled={working}>Run fresh preflight</button>
          )}
        </div>
      </div>

      <div className="app-agent-progress">
        <div className="app-agent-progress-copy">
          <strong>{steps.length ? `${completedCount} complete · ${reviewCount} review` : 'Not started'}</strong>
          <span>{run?.status === 'needs_review' ? 'Preflight finished — analyst action required' : working ? `${finishedCount} of ${steps.length} workstreams finished` : 'No credits consumed during preflight'}</span>
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
              onClick={() => setSelectedId(step.id)}
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
          {selected ? (
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
