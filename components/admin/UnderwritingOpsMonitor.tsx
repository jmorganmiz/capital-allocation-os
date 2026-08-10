'use client'

import { useMemo, useState, useTransition } from 'react'
import { requeueUnderwritingRun } from '@/lib/actions/platform-admin'

type Step = {
  status: string
  attempts: number
  started_at: string | null
  error_code: string | null
  error_message: string | null
}

type Run = {
  id: string
  run_type: string
  status: string
  error_code: string | null
  error_message: string | null
  credits_reserved: number
  credits_settled: number
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
  firms: { name: string } | null
  deals: { title: string | null; market: string | null } | null
  underwriting_steps: Step[] | null
}

function ageLabel(value: string | null) {
  if (!value) return 'not started'
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function runNeedsAttention(run: Run) {
  if (run.status === 'failed') return true
  return (run.underwriting_steps ?? []).some((step) => step.status === 'running' && step.started_at && Date.now() - new Date(step.started_at).getTime() > 15 * 60 * 1000)
}

export default function UnderwritingOpsMonitor({ initialRuns }: { initialRuns: Run[] }) {
  const [runs, setRuns] = useState(initialRuns)
  const [message, setMessage] = useState('')
  const [pendingId, setPendingId] = useState('')
  const [pending, startTransition] = useTransition()
  const stats = useMemo(() => {
    const active = runs.filter((run) => ['queued', 'running'].includes(run.status)).length
    const review = runs.filter((run) => run.status === 'needs_review').length
    const failed = runs.filter((run) => run.status === 'failed').length
    const attention = runs.filter(runNeedsAttention).length
    return { active, review, failed, attention }
  }, [runs])

  function requeue(runId: string) {
    setMessage('')
    setPendingId(runId)
    startTransition(async () => {
      const result = await requeueUnderwritingRun(runId)
      if (result.error) {
        setMessage(result.error)
      } else if ('requeued' in result) {
        setMessage(`Requeued ${result.requeued} workstream${result.requeued === 1 ? '' : 's'}. Cron will resume processing.`)
        setRuns((current) => current.map((run) => run.id === runId ? { ...run, status: 'running', error_code: null, error_message: null } : run))
      }
      setPendingId('')
    })
  }

  return (
    <section className="app-admin-ops">
      <div className="app-admin-ops-header">
        <div>
          <p className="app-eyebrow">Production readiness</p>
          <h2>Underwriting operations</h2>
          <span>Monitor live runs before customers have to report them.</span>
        </div>
        {message && <strong>{message}</strong>}
      </div>
      <div className="app-admin-ops-stats">
        <article><b>{stats.active}</b><span>Active</span></article>
        <article><b>{stats.review}</b><span>Needs review</span></article>
        <article data-tone="danger"><b>{stats.failed}</b><span>Failed</span></article>
        <article data-tone="amber"><b>{stats.attention}</b><span>Ops attention</span></article>
      </div>
      <div className="app-admin-run-list">
        {runs.length === 0 ? (
          <div className="app-sourcing-empty"><strong>No underwriting runs yet.</strong><span>Runs will appear here after firms start preflight or full underwriting.</span></div>
        ) : runs.map((run) => {
          const steps = run.underwriting_steps ?? []
          const retryable = run.status === 'failed' || runNeedsAttention(run)
          return (
            <article key={run.id} data-status={run.status} data-attention={runNeedsAttention(run)}>
              <div>
                <small>{run.firms?.name ?? 'Unknown firm'} / {run.run_type.replaceAll('_', ' ')}</small>
                <h3>{run.deals?.title ?? 'Untitled deal'}</h3>
                <p>{run.deals?.market ?? 'No market'} / updated {ageLabel(run.updated_at)}</p>
              </div>
              <dl>
                <div><dt>Status</dt><dd>{run.status.replace('_', ' ')}</dd></div>
                <div><dt>Steps</dt><dd>{steps.filter((step) => step.status === 'completed').length}/{steps.length}</dd></div>
                <div><dt>Started</dt><dd>{ageLabel(run.started_at)}</dd></div>
                <div><dt>Credits</dt><dd>{run.credits_settled}/{run.credits_reserved}</dd></div>
              </dl>
              <div className="app-admin-run-error">
                <span>{run.error_code ?? steps.find((step) => step.error_code)?.error_code ?? 'No error'}</span>
                <p>{run.error_message ?? steps.find((step) => step.error_message)?.error_message ?? 'Run is progressing normally or waiting on analyst review.'}</p>
              </div>
              <button type="button" onClick={() => requeue(run.id)} disabled={!retryable || pending || pendingId === run.id}>
                {pendingId === run.id ? 'Requeueing...' : retryable ? 'Requeue run' : 'Healthy'}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
