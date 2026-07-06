import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { processNextFullUnderwriteStep } from '@/lib/actions/full-underwrite'
import { processNextUnderwritingStep } from '@/lib/actions/underwriting-room'
import { INTERNAL_UNDERWRITING_WORKER } from '@/lib/internal/underwriting-worker'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const STALE_AFTER_MS = 15 * 60 * 1000
const MAX_RUNS_PER_SWEEP = 8
const MAX_STEPS_PER_RUN = 12
const MAX_SWEEP_MS = 45 * 1000

function isAuthorized(request: Request) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || !auth?.startsWith('Bearer ')) return false
  const provided = Buffer.from(auth.slice(7))
  const expected = Buffer.from(secret)
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const startedAt = Date.now()
  const admin = createAdminClient()
  const cutoff = new Date(startedAt - STALE_AFTER_MS).toISOString()
  const summary = {
    staleRequeued: 0,
    staleFailed: 0,
    runsVisited: 0,
    stepsProcessed: 0,
    errors: [] as Array<{ runId: string; message: string }>,
  }

  const { data: staleSteps, error: staleError } = await admin
    .from('underwriting_steps')
    .select('id, run_id, attempts')
    .eq('status', 'running')
    .lt('started_at', cutoff)
    .order('started_at')
    .limit(50)
  if (staleError) return NextResponse.json({ error: staleError.message }, { status: 500 })

  for (const step of staleSteps ?? []) {
    if (step.attempts >= 3) {
      const { data: failed } = await admin.from('underwriting_steps').update({
        status: 'failed',
        error_code: 'WORKER_STALLED_MAX_ATTEMPTS',
        error_message: 'This workstream stalled three times and requires support review.',
        completed_at: new Date().toISOString(),
      }).eq('id', step.id).eq('status', 'running').select('id').maybeSingle()
      if (failed) {
        summary.staleFailed += 1
        await admin.from('underwriting_runs').update({
          status: 'failed',
          error_code: 'WORKER_STALLED_MAX_ATTEMPTS',
          error_message: 'A background workstream exceeded its retry limit.',
          completed_at: new Date().toISOString(),
        }).eq('id', step.run_id).eq('status', 'running')
      }
    } else {
      const { data: requeued } = await admin.from('underwriting_steps').update({
        status: 'queued',
        started_at: null,
        completed_at: null,
        error_code: 'WORKER_STALE_REQUEUED',
        error_message: 'Recovered automatically after the prior worker stopped reporting progress.',
      }).eq('id', step.id).eq('status', 'running').select('id').maybeSingle()
      if (requeued) summary.staleRequeued += 1
    }
  }

  const [{ data: queued }, { data: retryable }] = await Promise.all([
    admin.from('underwriting_steps').select('run_id').eq('status', 'queued').order('created_at').limit(80),
    admin.from('underwriting_steps').select('run_id').eq('status', 'failed').lt('attempts', 3).order('created_at').limit(40),
  ])
  const runIds = [...new Set([...(queued ?? []), ...(retryable ?? [])].map((step) => step.run_id))].slice(0, MAX_RUNS_PER_SWEEP)

  for (const runId of runIds) {
    if (Date.now() - startedAt > MAX_SWEEP_MS) break
    const { data: run } = await admin.from('underwriting_runs').select('run_type, status').eq('id', runId).single()
    if (!run || ['completed', 'canceled', 'needs_review'].includes(run.status)) continue
    if (run.run_type !== 'preflight' && run.run_type !== 'full_underwrite') continue
    summary.runsVisited += 1

    for (let iteration = 0; iteration < MAX_STEPS_PER_RUN; iteration += 1) {
      if (Date.now() - startedAt > MAX_SWEEP_MS) break
      const result = run.run_type === 'full_underwrite'
        ? await processNextFullUnderwriteStep(runId, INTERNAL_UNDERWRITING_WORKER)
        : await processNextUnderwritingStep(runId, INTERNAL_UNDERWRITING_WORKER)
      if (result.error) {
        summary.errors.push({ runId, message: result.error })
        break
      }
      summary.stepsProcessed += 1
      const steps = result.steps ?? []
      if (steps.some((step) => step.status === 'needs_review')) break
      const retryableWork = steps.some((step) => step.status === 'queued' || (step.status === 'failed' && step.attempts < 3))
      if (!retryableWork) break
    }
  }

  return NextResponse.json({ ok: true, durationMs: Date.now() - startedAt, ...summary })
}
