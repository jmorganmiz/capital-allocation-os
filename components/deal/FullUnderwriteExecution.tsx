'use client'

import { useState } from 'react'
import { continueWithLockedUnderwritingInputs, processNextFullUnderwriteStep, reviewExtractedUnderwritingFact, startFullUnderwrite } from '@/lib/actions/full-underwrite'
import type { Json, UnderwritingAssumption, UnderwritingRun, UnderwritingStep } from '@/lib/types/database'

type Props = {
  dealId: string
  preflightRun: UnderwritingRun | null
  initialRun: UnderwritingRun | null
  initialSteps: UnderwritingStep[]
  initialAssumptions: UnderwritingAssumption[]
  monthlyAllowance: number
  usedCredits: number
  revisionCount: number
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

function displayFact(fact: UnderwritingAssumption) {
  const value = Number(fact.value)
  if (!Number.isFinite(value)) return 'Missing'
  if (fact.unit === '%') return `${(value * 100).toFixed(2).replace(/\.00$/, '')}%`
  if (fact.unit?.startsWith('$')) return `$${value.toLocaleString()}${fact.unit === '$' ? '' : ` ${fact.unit.replace('$', '')}`}`
  return `${value.toLocaleString()} ${fact.unit ?? ''}`.trim()
}

function editFact(fact: UnderwritingAssumption) {
  const value = Number(fact.value)
  return Number.isFinite(value) ? String(fact.unit === '%' ? value * 100 : value) : ''
}

const statusLabel: Record<UnderwritingStep['status'], string> = {
  queued: 'Queued', running: 'Running', needs_review: 'Review', completed: 'Complete', failed: 'Failed', canceled: 'Canceled',
}

export default function FullUnderwriteExecution({ dealId, preflightRun, initialRun, initialSteps, initialAssumptions, monthlyAllowance, usedCredits, revisionCount }: Props) {
  const [run, setRun] = useState(initialRun)
  const [steps, setSteps] = useState(initialSteps)
  const [assumptions, setAssumptions] = useState(initialAssumptions)
  const [working, setWorking] = useState(false)
  const [reviewingId, setReviewingId] = useState('')
  const [revisions, setRevisions] = useState<Record<string, string>>(() => Object.fromEntries(initialAssumptions.map((fact) => [fact.id, editFact(fact)])))
  const [creditsUsed, setCreditsUsed] = useState(usedCredits)
  const [versionsUsed, setVersionsUsed] = useState(revisionCount)
  const [error, setError] = useState('')
  const preflightApproved = Boolean(preflightRun?.approved_at && preflightRun.status === 'completed')
  const completed = steps.filter((step) => step.status === 'completed').length
  const flagged = steps.filter((step) => step.status === 'needs_review' || step.status === 'failed').length
  const output = record(run?.output_snapshot ?? null)
  const sensitivity = record((output.sensitivity ?? null) as Json | null)
  const exitShifts = Array.isArray(sensitivity.exit_cap_shifts) ? sensitivity.exit_cap_shifts : []
  const growthShifts = Array.isArray(sensitivity.rent_growth_shifts) ? sensitivity.rent_growth_shifts : []
  const sensitivityValues = Array.isArray(sensitivity.levered_irr) ? sensitivity.levered_irr : []
  const noiByYear = Array.isArray(output.noiByYear) ? output.noiByYear : []
  const debtServiceByYear = Array.isArray(output.debtServiceByYear) ? output.debtServiceByYear : []
  const capexByYear = Array.isArray(output.capexByYear) ? output.capexByYear : []
  const leaseUpDeficitByYear = Array.isArray(output.leaseUpDeficitByYear) ? output.leaseUpDeficitByYear : []
  const cashFlowByYear = Array.isArray(output.cashFlowBeforeTax) ? output.cashFlowBeforeTax : []
  const refinance = record((output.refinance ?? null) as Json | null)
  const taxes = record((output.taxes ?? null) as Json | null)
  const waterfall = record((output.waterfall ?? null) as Json | null)
  const operatingReserve = record((output.operatingReserve ?? null) as Json | null)
  const waterfallClasses = Array.isArray(waterfall.classes)
    ? waterfall.classes.map((value) => record(value as Json)).filter((value) => Object.keys(value).length > 0)
    : []
  const documentStep = steps.find((step) => step.step_key === 'document_evidence')
  const documentArtifact = record(documentStep?.artifact ?? null)
  const extractionWarnings = Array.isArray(documentArtifact.extraction_warnings)
    ? documentArtifact.extraction_warnings.filter((warning): warning is string => typeof warning === 'string')
    : []

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
      if (result.assumptions) {
        setAssumptions(result.assumptions)
        setRevisions((values) => ({ ...values, ...Object.fromEntries(result.assumptions!.map((fact) => [fact.id, editFact(fact)])) }))
      }
      if (current.some((step) => step.status === 'needs_review' || step.status === 'failed')) break
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
    if (result.run.credits_reserved > 0) setCreditsUsed((value) => value + result.run!.credits_reserved)
    setVersionsUsed((value) => value + 1)
    setSteps(created)
    setWorking(false)
    await process(result.run.id, created)
  }

  async function reviewFact(fact: UnderwritingAssumption, decision: 'approved' | 'rejected' | 'revised') {
    if (!run || reviewingId) return
    setReviewingId(fact.id)
    setError('')
    const entered = Number(revisions[fact.id])
    const revised = decision === 'revised' ? fact.unit === '%' ? entered / 100 : entered : undefined
    const result = await reviewExtractedUnderwritingFact(run.id, fact.id, decision, revised)
    if (result.error) setError(result.error)
    if (result.run) setRun(result.run)
    if (result.steps) setSteps(result.steps)
    if (result.assumptions) {
      setAssumptions(result.assumptions)
      setRevisions((values) => ({ ...values, ...Object.fromEntries(result.assumptions!.map((item) => [item.id, editFact(item)])) }))
    }
    setReviewingId('')
    if (!result.error && result.steps && !result.assumptions?.some((item) => item.approval_status === 'needs_review')) {
      await process(run.id, result.steps)
    }
  }

  async function continueLocked() {
    if (!run || working) return
    setWorking(true)
    setError('')
    const result = await continueWithLockedUnderwritingInputs(run.id)
    if (result.error) setError(result.error)
    if (result.run) setRun(result.run)
    if (result.steps) setSteps(result.steps)
    setWorking(false)
    if (!result.error && result.steps) await process(run.id, result.steps)
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
          <span>{Math.max(0, monthlyAllowance - creditsUsed)} of {monthlyAllowance} remaining</span>
          <button type="button" onClick={start} disabled={!preflightApproved || working || versionsUsed >= 3 || (versionsUsed === 0 && creditsUsed >= monthlyAllowance)}>
            {working ? 'Executing…' : versionsUsed === 0 ? 'Run approved package · 1 credit' : versionsUsed < 3 ? `Run included revision · ${versionsUsed - 1}/2 used` : 'Revision limit reached'}
          </button>
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
          {extractionWarnings.length > 0 && (
            <div className="app-extraction-warnings">
              <strong>Extraction guardrails</strong>
              <ul>{extractionWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>
          )}
          {assumptions.length > 0 && assumptions.some((fact) => fact.approval_status === 'needs_review') && (
            <div className="app-extraction-review">
              <div className="app-extraction-review-header">
                <div><span>Evidence review</span><h3>Approve cited document facts</h3></div>
                <strong>{assumptions.filter((fact) => fact.approval_status === 'needs_review').length} pending</strong>
              </div>
              <div className="app-extraction-facts">
                {assumptions.map((fact) => (
                  <article key={fact.id} data-status={fact.approval_status}>
                    <div className="app-extraction-fact-title"><strong>{fact.label}</strong><span>{fact.approval_status.replace('_', ' ')}</span></div>
                    <b>{displayFact(fact)}</b>
                    <p>{fact.source_excerpt || 'No verified excerpt returned.'}</p>
                    <small>{fact.source_reference ?? 'Unlocated source'} · {Math.round((fact.confidence ?? 0) * 100)}% confidence</small>
                    <div className="app-extraction-fact-actions">
                      <input aria-label={`Revise ${fact.label}`} value={revisions[fact.id] ?? ''} onChange={(event) => setRevisions((values) => ({ ...values, [fact.id]: event.target.value }))} />
                      <button type="button" onClick={() => reviewFact(fact, 'approved')} disabled={reviewingId === fact.id}>Approve</button>
                      <button type="button" onClick={() => reviewFact(fact, 'revised')} disabled={reviewingId === fact.id}>Revise</button>
                      <button type="button" className="danger" onClick={() => reviewFact(fact, 'rejected')} disabled={reviewingId === fact.id}>Reject</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
          {assumptions.length === 0 && steps.some((step) => step.step_key === 'document_evidence' && step.status === 'needs_review') && (
            <div className="app-extraction-empty-review">
              <div><span>Evidence exception</span><strong>No supported cited facts were available.</strong><p>Continue with the already approved preflight inputs, or upload a clearer PDF and run a new version.</p></div>
              <button type="button" onClick={continueLocked} disabled={working}>Continue with locked inputs</button>
            </div>
          )}
          {Object.keys(output).length > 0 && (
            <div className="app-full-execution-results">
              <div><span>Levered IRR</span><strong>{percent(output.leveredIrr)}</strong></div>
              <div><span>Equity multiple</span><strong>{multiple(output.equityMultiple)}</strong></div>
              <div><span>Year 1 DSCR</span><strong>{multiple(output.yearOneDscr)}</strong></div>
              <div><span>Required equity</span><strong>{money(output.totalEquityInvested)}</strong></div>
              <div><span>Exit value</span><strong>{money(output.grossExitValue)}</strong></div>
              {Object.keys(refinance).length > 0 && <div><span>Refinance proceeds</span><strong>{money(refinance.proceeds)}</strong></div>}
              {Object.keys(waterfall).length > 0 && <div><span>LP IRR</span><strong>{percent(waterfall.lpIrr)}</strong></div>}
              {Object.keys(waterfall).length > 0 && <div><span>GP IRR</span><strong>{percent(waterfall.gpIrr)}</strong></div>}
              {Number(operatingReserve.initial ?? 0) > 0 && <div><span>Reserve drawn</span><strong>{money(operatingReserve.drawn)}</strong></div>}
              {Number(operatingReserve.initial ?? 0) > 0 && <div><span>Reserve released</span><strong>{money(operatingReserve.releasedAtExit)}</strong></div>}
              {Number(taxes.incomeTax ?? 0) > 0 && <div><span>Modeled income tax</span><strong>{money(taxes.incomeTax)}</strong></div>}
              {run?.status === 'completed' && <div><span>IC package</span><strong><a href={`/api/underwriting/${run.id}/memo`}>Download PDF</a></strong></div>}
            </div>
          )}
          {noiByYear.length > 0 && (
            <div className="app-monthly-model-summary">
              <div><span>{String(output.modelVersion ?? 'Model v0.4')}</span><h3>Monthly projection · annual rollup</h3><p>Calculated monthly; summarized here for IC review.</p></div>
              <div className="app-monthly-model-table-wrap">
                <table>
                  <thead><tr><th>Metric</th>{noiByYear.map((_, index) => <th key={index}>Year {index + 1}</th>)}</tr></thead>
                  <tbody>
                    <tr><th>NOI</th>{noiByYear.map((value, index) => <td key={index}>{money(value as Json)}</td>)}</tr>
                    <tr><th>Debt service</th>{debtServiceByYear.map((value, index) => <td key={index}>{money(value as Json)}</td>)}</tr>
                    <tr><th>Capital spend</th>{capexByYear.map((value, index) => <td key={index}>{money(value as Json)}</td>)}</tr>
                    <tr><th>Lease-up deficit</th>{leaseUpDeficitByYear.map((value, index) => <td key={index}>{money(value as Json)}</td>)}</tr>
                    <tr><th>Cash flow</th>{cashFlowByYear.map((value, index) => <td key={index}>{money(value as Json)}</td>)}</tr>
                  </tbody>
                </table>
              </div>
              <small>Tax estimates are optional and not tax advice. Waterfall uses a European whole-fund structure with return of capital, preferred return, catch-up, and promote tiers.</small>
            </div>
          )}
          {waterfallClasses.length > 0 && (
            <div className="app-waterfall-class-summary">
              <div><span>Capital stack</span><h3>Equity-class waterfall</h3><p>Each class reconciles to its share of project cash flow before aggregate LP and GP returns are calculated.</p></div>
              <div className="app-waterfall-class-grid">
                {waterfallClasses.map((equityClass) => (
                  <article key={String(equityClass.key)}>
                    <div><strong>{String(equityClass.name)}</strong><span>{percent(equityClass.capitalShare)}</span></div>
                    <dl>
                      <div><dt>LP IRR</dt><dd>{percent(equityClass.lpIrr)}</dd></div>
                      <div><dt>LP multiple</dt><dd>{multiple(equityClass.lpEquityMultiple)}</dd></div>
                      <div><dt>GP IRR</dt><dd>{percent(equityClass.gpIrr)}</dd></div>
                      <div><dt>GP multiple</dt><dd>{multiple(equityClass.gpEquityMultiple)}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            </div>
          )}
          {exitShifts.length === 3 && growthShifts.length === 3 && (
            <div className="app-sensitivity-panel">
              <div><span>Sensitivity</span><h3>Levered IRR by rent growth and exit cap</h3></div>
              <table>
                <thead><tr><th>Growth \ Exit</th>{exitShifts.map((shift) => <th key={String(shift)}>{Number(shift) > 0 ? '+' : ''}{(Number(shift) * 100).toFixed(1)}%</th>)}</tr></thead>
                <tbody>{growthShifts.map((growth, row) => (
                  <tr key={String(growth)}><th>{Number(growth) > 0 ? '+' : ''}{(Number(growth) * 100).toFixed(1)}%</th>{exitShifts.map((_, column) => {
                    const values = sensitivityValues[row]
                    const value = Array.isArray(values) ? values[column] as Json : undefined
                    return <td key={column} data-base={row === 1 && column === 1}>{percent(value)}</td>
                  })}</tr>
                ))}</tbody>
              </table>
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
