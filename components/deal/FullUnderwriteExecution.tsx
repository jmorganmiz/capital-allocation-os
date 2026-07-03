'use client'

import { useState } from 'react'
import { processNextFullUnderwriteStep, startFullUnderwrite } from '@/lib/actions/full-underwrite'
import type { Json, UnderwritingRun, UnderwritingStep } from '@/lib/types/database'

type Props = {
  dealId: string
  preflightRun: UnderwritingRun | null
  initialRun: UnderwritingRun | null
  initialSteps: UnderwritingStep[]
}

function record(value: Json | null): Record<string, Json> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, Json> : {}
}

function percent(value: Json | undefined) {
  const number = Number(value)
  return Number.isFinite(number) ? `${(number * 100).toFixed(1)}%` : '—'
}

function multiple(value: Json | undefined) {
  const number = Number(value)
  return Number.isFinite(number) ? `${number.toFixed(2)}x` : '—'
}

function money(value: Json | undefined) {
  const number = Number(value)
  return Number.isFinite(number) ? `$${Math.round(number).toLocaleString()}` : '—'
}

const statusLabel: Record<UnderwritingStep['status'], string> = {
  queued: 'Queued', running: 'Running', needs_review: 'Review', completed: 'Complete', failed: 'Failed', canceled: 'Canceled',
}

export default function FullUnderwriteExecution({ dealId, preflightRun, initialRun, initialSteps }: Props) {
  const [run, setRun] = useState(initialRun)
  const [steps, setSteps] = useState(initialSteps)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const preflightApproved = Boolean(preflightRun?.approved_at && preflightRun.status === 'completed')
  const completed = steps.filter((step) => step.status === 'completed').length
  const flagged = steps.filter((step) => step.status === 'needs_review' || step.status === 'failed').length
  const output = record(run?.output_snapshot ?? null)

  async function process(runId: string, startingSteps: UnderwritingStep[]) {
    setWorking(true)
    let current = startingSteps
    for (let iteration = 0; iteration < 12; iteration += 1) {
      if (!current.some((step) => step.status === 'queued')) break
      const result = await processNextFullUnderwriteStep(runId)
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
    if (!preflightRun || working) return
    setWorking(true)
    setError('')
    const result = await startFullUnderwrite(dealId, preflightRun.id, crypto.randomUUID())
    if (result.error || !result.run) {
      setError(result.error ?? 'Could not start execution.')
      setWorking(false)
      return
    }
    const created = result.steps ?? []
    setRun(result.run)
    setSteps(created)
    setWorking(false)
    await process(result.run.id, created)
  }

  return (
    <section className="app-full-execution" data-locked={!preflightApproved}>
      <header className="app-full-execution-header">
        <div>
          <p>Full Underwrite <span>Deterministic pass</span></p>
          <h2>Execution Room</h2>
          <small>Runs the versioned financial model from the approved package. Document extraction and provider credits remain separate.</small>
        </div>
        <div className="app-full-execution-action">
          <span>0 credits</span>
          <button type="button" onClick={start} disabled={!preflightApproved || working}>{working ? 'Executing…' : run ? 'Run new version' : 'Run approved package'}</button>
        </div>
      </header>

      {!preflightApproved ? (
        <div className="app-full-execution-gate">
          <span>Locked</span>
          <div><strong>Approve preflight first</strong><p>The execution engine only accepts a human-approved, immutable input package.</p></div>
        </div>
      ) : steps.length ? (
        <>
          <div className="app-full-execution-progress">
            <strong>{completed} complete · {flagged} flagged</strong>
            <div><span style={{ width: `${steps.length ? (completed / steps.length) * 100 : 0}%` }} /></div>
            <small>{run?.status === 'completed' ? 'Deterministic package complete' : run?.status === 'needs_review' ? 'Analyst review required' : 'Execution in progress'}</small>
          </div>
          <div className="app-full-execution-grid">
            {steps.map((step) => (
              <article key={step.id} data-status={step.status}>
                <div><span>{String(step.position + 1).padStart(2, '0')}</span><em>{statusLabel[step.status]}</em></div>
                <strong>{step.label}</strong>
                <p>{step.artifact_summary ?? 'Waiting for prior workstream'}</p>
              </article>
            ))}
          </div>
          {Object.keys(output).length > 0 && (
            <div className="app-full-execution-results">
              <div><span>Levered IRR</span><strong>{percent(output.leveredIrr)}</strong></div>
              <div><span>Equity multiple</span><strong>{multiple(output.equityMultiple)}</strong></div>
              <div><span>Year 1 DSCR</span><strong>{multiple(output.yearOneDscr)}</strong></div>
              <div><span>Required equity</span><strong>{money(output.totalEquityInvested)}</strong></div>
              <div><span>Exit value</span><strong>{money(output.grossExitValue)}</strong></div>
            </div>
          )}
        </>
      ) : (
        <div className="app-full-execution-empty">
          <span>Ready</span>
          <strong>The approved package can now enter deterministic execution.</strong>
          <p>This pass validates the run graph, source coverage, reconciliation, and financial outputs without consuming a Full Underwrite credit.</p>
        </div>
      )}
      {error && <p className="app-uw-error" role="alert">{error}</p>}
    </section>
  )
}

