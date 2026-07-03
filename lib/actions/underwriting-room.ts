'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Json, UnderwritingRun, UnderwritingStep } from '@/lib/types/database'

const PREFLIGHT_VERSION = 'underwriting-preflight-0.1.0'

const STEP_DEFINITIONS = [
  ['deal_intake', 'Deal intake'],
  ['document_inventory', 'Document inventory'],
  ['financial_baseline', 'Financial baseline'],
  ['comparable_memory', 'Comparable memory'],
  ['assumption_review', 'Assumption gaps'],
  ['risk_review', 'Risk review'],
  ['scenario_summary', 'Scenario summary'],
  ['ic_readiness', 'IC readiness'],
] as const

type StepResult = {
  summary: string
  artifact: Json
  evidenceCount: number
  confidence: number
  needsReview?: boolean
  sources?: Array<{
    deal_file_id?: string | null
    source_type: string
    title: string
    locator?: string | null
    excerpt?: string | null
    confidence?: number | null
  }>
}

async function getMembership(dealId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found.' as const }

  if (dealId) {
    const { data: deal } = await supabase
      .from('deals')
      .select('id, firm_id')
      .eq('id', dealId)
      .single()
    if (!deal || deal.firm_id !== profile.firm_id) return { error: 'Deal not found.' as const }
  }

  return { supabase, user, firmId: profile.firm_id }
}

export async function startUnderwritingPreflight(
  dealId: string,
  requestId: string,
): Promise<{ run?: UnderwritingRun; steps?: UnderwritingStep[]; error?: string }> {
  try {
    if (!dealId || !requestId || requestId.length > 200) return { error: 'Invalid request.' }
    const membership = await getMembership(dealId)
    if ('error' in membership) return membership

    const { supabase, user, firmId } = membership
    const { data: entitlement } = await supabase
      .from('firm_entitlements')
      .select('underwriting_enabled')
      .eq('firm_id', firmId)
      .maybeSingle()
    if (!entitlement?.underwriting_enabled) return { error: 'Underwriting Pro is not enabled.' }

    const admin = createAdminClient()
    const idempotencyKey = `${requestId}:preflight`
    const { data: existing } = await admin
      .from('underwriting_runs')
      .select('*')
      .eq('firm_id', firmId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    if (existing) {
      const { data: existingSteps } = await admin
        .from('underwriting_steps')
        .select('*')
        .eq('run_id', existing.id)
        .order('position')
      return { run: existing, steps: existingSteps ?? [] }
    }

    const { data: latestBase } = await admin
      .from('underwriting_runs')
      .select('id')
      .eq('firm_id', firmId)
      .eq('deal_id', dealId)
      .eq('run_type', 'quick_pencil')
      .eq('scenario_key', 'base')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const runId = randomUUID()
    const now = new Date().toISOString()
    const { data: run, error: runError } = await admin
      .from('underwriting_runs')
      .insert({
        id: runId,
        firm_id: firmId,
        deal_id: dealId,
        run_type: 'full_underwrite',
        scenario_key: 'base',
        status: 'queued',
        assumption_status: 'needs_review',
        model_version: PREFLIGHT_VERSION,
        projection_start_date: now.slice(0, 10),
        input_snapshot: {
          quick_pencil_run_id: latestBase?.id ?? null,
          phase: 'preflight',
        },
        warnings: [],
        credits_reserved: 0,
        credits_settled: 0,
        idempotency_key: idempotencyKey,
        created_by: user.id,
      })
      .select('*')
      .single()
    if (runError || !run) throw runError ?? new Error('Could not create underwriting run.')

    const { data: steps, error: stepError } = await admin
      .from('underwriting_steps')
      .insert(STEP_DEFINITIONS.map(([stepKey, label], position) => ({
        firm_id: firmId,
        run_id: runId,
        step_key: stepKey,
        label,
        position,
        status: 'queued' as const,
      })))
      .select('*')
    if (stepError) throw stepError

    revalidatePath(`/deals/${dealId}`)
    return { run, steps: steps ?? [] }
  } catch (error) {
    console.error('[underwriting-room] start failed:', error instanceof Error ? error.message : 'unknown error')
    return { error: error instanceof Error ? error.message : 'Could not start underwriting.' }
  }
}

async function buildStepResult(
  admin: ReturnType<typeof createAdminClient>,
  run: UnderwritingRun,
  step: UnderwritingStep,
): Promise<StepResult> {
  if (step.step_key === 'deal_intake') {
    const [{ data: deal }, { data: snapshots }] = await Promise.all([
      admin.from('deals').select('*').eq('id', run.deal_id).eq('firm_id', run.firm_id).single(),
      admin.from('deal_financial_snapshots').select('*').eq('deal_id', run.deal_id).order('created_at', { ascending: false }).limit(1),
    ])
    if (!deal) throw new Error('Deal record is unavailable.')
    const snapshot = snapshots?.[0] ?? null
    const values = [deal.title, deal.market, deal.deal_type, deal.asking_price, deal.address, snapshot?.noi, snapshot?.num_units]
    const captured = values.filter((value) => value !== null && value !== undefined && value !== '').length
    return {
      summary: `${captured} core deal fields prepared`,
      artifact: { deal, latest_financial_snapshot: snapshot },
      evidenceCount: 1,
      confidence: Math.min(1, captured / values.length),
      sources: [{ source_type: 'deal_record', title: 'Dealstash deal record', confidence: 1 }],
    }
  }

  if (step.step_key === 'document_inventory') {
    const { data: files } = await admin
      .from('deal_files')
      .select('id, filename, mime_type, size_bytes, created_at')
      .eq('deal_id', run.deal_id)
      .order('created_at', { ascending: false })
    const records = files ?? []
    return {
      summary: records.length ? `${records.length} deal document${records.length === 1 ? '' : 's'} inventoried` : 'No deal documents found',
      artifact: { files: records, requires_documents: records.length === 0 },
      evidenceCount: records.length,
      confidence: records.length ? 1 : 0.2,
      needsReview: records.length === 0,
      sources: records.map((file) => ({
        deal_file_id: file.id,
        source_type: 'deal_file',
        title: file.filename,
        confidence: 1,
      })),
    }
  }

  if (step.step_key === 'financial_baseline') {
    const { data: base } = await admin
      .from('underwriting_runs')
      .select('id, model_version, input_snapshot, output_snapshot, created_at')
      .eq('firm_id', run.firm_id)
      .eq('deal_id', run.deal_id)
      .eq('run_type', 'quick_pencil')
      .eq('scenario_key', 'base')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return {
      summary: base ? 'Latest Quick Pencil baseline linked' : 'Quick Pencil baseline is missing',
      artifact: { quick_pencil: base },
      evidenceCount: base ? 1 : 0,
      confidence: base ? 0.9 : 0.1,
      needsReview: !base,
      sources: base ? [{ source_type: 'deal_record', title: `Quick Pencil ${base.model_version}`, confidence: 0.9 }] : [],
    }
  }

  if (step.step_key === 'comparable_memory') {
    const { data: current } = await admin
      .from('deals')
      .select('market, deal_type')
      .eq('id', run.deal_id)
      .single()
    const { data: candidates } = await admin
      .from('deals')
      .select('id, title, market, deal_type, asking_price, is_archived, updated_at')
      .eq('firm_id', run.firm_id)
      .neq('id', run.deal_id)
      .limit(100)
    const matches = (candidates ?? []).filter((deal) => (
      (current?.market && deal.market === current.market)
      || (current?.deal_type && deal.deal_type === current.deal_type)
    )).slice(0, 8)
    return {
      summary: matches.length ? `${matches.length} comparable firm deal${matches.length === 1 ? '' : 's'} found` : 'No comparable firm deals yet',
      artifact: { matches },
      evidenceCount: matches.length,
      confidence: matches.length >= 3 ? 0.8 : matches.length ? 0.55 : 0.2,
      needsReview: matches.length === 0,
      sources: matches.map((deal) => ({ source_type: 'firm_memory', title: deal.title, confidence: 0.75 })),
    }
  }

  if (step.step_key === 'assumption_review') {
    const { data: base } = await admin
      .from('underwriting_runs')
      .select('input_snapshot')
      .eq('firm_id', run.firm_id)
      .eq('deal_id', run.deal_id)
      .eq('run_type', 'quick_pencil')
      .eq('scenario_key', 'base')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const input = base?.input_snapshot && typeof base.input_snapshot === 'object' && !Array.isArray(base.input_snapshot)
      ? base.input_snapshot as Record<string, Json>
      : {}
    const tracked = ['vacancyPct', 'rentGrowthInPlace', 'exitCapRate', 'interestRate', 'renovationCostPerUnit']
    const assumptions = tracked.map((key) => ({ key, value: input[key] ?? null, source: 'screening_input', approval: 'needs_review' }))
    const missing = assumptions.filter((item) => item.value === null).map((item) => item.key)
    return {
      summary: missing.length ? `${missing.length} key assumption${missing.length === 1 ? '' : 's'} missing` : 'Five screening assumptions await approval',
      artifact: { assumptions, missing },
      evidenceCount: assumptions.length - missing.length,
      confidence: missing.length ? 0.45 : 0.7,
      needsReview: true,
    }
  }

  if (step.step_key === 'risk_review') {
    const [{ data: notes }, { data: scores }] = await Promise.all([
      admin.from('deal_notes').select('section, content').eq('deal_id', run.deal_id),
      admin.from('deal_scores').select('score, notes, scoring_criteria(name)').eq('deal_id', run.deal_id),
    ])
    const riskNote = (notes ?? []).find((note) => note.section === 'risks')?.content?.trim() ?? ''
    const lowScores = (scores ?? []).filter((score) => Number(score.score) <= 2)
    return {
      summary: `${lowScores.length} low score${lowScores.length === 1 ? '' : 's'} and ${riskNote ? 'documented risk notes' : 'no risk narrative'}`,
      artifact: { risk_note: riskNote || null, low_scores: lowScores },
      evidenceCount: lowScores.length + (riskNote ? 1 : 0),
      confidence: riskNote || lowScores.length ? 0.75 : 0.3,
      needsReview: !riskNote,
    }
  }

  if (step.step_key === 'scenario_summary') {
    const { data: scenarios } = await admin
      .from('underwriting_runs')
      .select('id, scenario_key, input_snapshot, output_snapshot, model_version, created_at')
      .eq('firm_id', run.firm_id)
      .eq('deal_id', run.deal_id)
      .eq('run_type', 'quick_pencil')
      .order('created_at', { ascending: false })
      .limit(3)
    const records = scenarios ?? []
    return {
      summary: records.length === 3 ? 'Downside, base, and upside cases linked' : `${records.length} screening scenario${records.length === 1 ? '' : 's'} available`,
      artifact: { scenarios: records },
      evidenceCount: records.length,
      confidence: records.length === 3 ? 0.9 : 0.4,
      needsReview: records.length < 3,
    }
  }

  const [{ data: files }, { data: notes }, { data: quick }] = await Promise.all([
    admin.from('deal_files').select('id').eq('deal_id', run.deal_id),
    admin.from('deal_notes').select('section, content').eq('deal_id', run.deal_id),
    admin.from('underwriting_runs').select('id').eq('deal_id', run.deal_id).eq('run_type', 'quick_pencil').limit(1),
  ])
  const completedNoteSections = new Set((notes ?? []).filter((note) => note.content?.trim()).map((note) => note.section))
  const missing = [
    ...(files?.length ? [] : ['Deal documents']),
    ...(quick?.length ? [] : ['Quick Pencil']),
    ...(completedNoteSections.has('overview') ? [] : ['Investment thesis']),
    ...(completedNoteSections.has('risks') ? [] : ['Risk narrative']),
  ]
  return {
    summary: missing.length ? `${missing.length} item${missing.length === 1 ? '' : 's'} block IC readiness` : 'Preflight package is ready for analyst approval',
    artifact: { ready: missing.length === 0, missing },
    evidenceCount: 4 - missing.length,
    confidence: missing.length ? 0.55 : 0.9,
    needsReview: true,
  }
}

export async function processNextUnderwritingStep(
  runId: string,
): Promise<{ run?: UnderwritingRun; steps?: UnderwritingStep[]; error?: string }> {
  const membership = await getMembership()
  if ('error' in membership) return membership
  const { user, firmId } = membership
  const admin = createAdminClient()

  const { data: run } = await admin
    .from('underwriting_runs')
    .select('*')
    .eq('id', runId)
    .eq('firm_id', firmId)
    .single()
  if (!run) return { error: 'Underwriting run not found.' }

  const { data: queued } = await admin
    .from('underwriting_steps')
    .select('*')
    .eq('run_id', runId)
    .eq('status', 'queued')
    .order('position')
    .limit(1)
    .maybeSingle()
  const { data: retryable } = queued ? { data: null } : await admin
    .from('underwriting_steps')
    .select('*')
    .eq('run_id', runId)
    .eq('status', 'failed')
    .lt('attempts', 3)
    .order('position')
    .limit(1)
    .maybeSingle()
  const next = queued ?? retryable

  if (!next) {
    const { data: steps } = await admin.from('underwriting_steps').select('*').eq('run_id', runId).order('position')
    return { run, steps: steps ?? [] }
  }

  const startedAt = new Date().toISOString()
  const { data: claimed } = await admin
    .from('underwriting_steps')
    .update({
      status: 'running',
      attempts: next.attempts + 1,
      started_at: startedAt,
      error_code: null,
      error_message: null,
    })
    .eq('id', next.id)
    .eq('status', next.status)
    .select('*')
    .maybeSingle()
  if (!claimed) return { error: 'This workstream was claimed by another worker.' }

  await admin.from('underwriting_runs').update({ status: 'running', started_at: run.started_at ?? startedAt }).eq('id', runId)

  try {
    const result = await buildStepResult(admin, run, claimed)
    const completedAt = new Date().toISOString()
    const { error: updateError } = await admin
      .from('underwriting_steps')
      .update({
        status: result.needsReview ? 'needs_review' : 'completed',
        artifact_summary: result.summary,
        artifact: result.artifact,
        evidence_count: result.evidenceCount,
        confidence: result.confidence,
        completed_at: completedAt,
      })
      .eq('id', claimed.id)
    if (updateError) throw updateError

    if (result.sources?.length) {
      const { error: sourceError } = await admin.from('underwriting_sources').insert(result.sources.map((source) => ({
        firm_id: firmId,
        run_id: runId,
        step_id: claimed.id,
        deal_file_id: source.deal_file_id ?? null,
        source_type: source.source_type,
        title: source.title,
        locator: source.locator ?? null,
        excerpt: source.excerpt ?? null,
        confidence: source.confidence ?? null,
      })))
      if (sourceError) throw sourceError
    }
  } catch (error) {
    await admin.from('underwriting_steps').update({
      status: 'failed',
      error_code: 'STEP_FAILED',
      error_message: error instanceof Error ? error.message.slice(0, 500) : 'Unknown step error',
      completed_at: new Date().toISOString(),
    }).eq('id', claimed.id)
  }

  const { data: steps } = await admin
    .from('underwriting_steps')
    .select('*')
    .eq('run_id', runId)
    .order('position')
  const hasQueued = (steps ?? []).some((step) => step.status === 'queued' || step.status === 'running')
  const hasFailed = (steps ?? []).some((step) => step.status === 'failed')
  const runStatus = hasFailed ? 'failed' : hasQueued ? 'running' : 'needs_review'
  const { data: updatedRun } = await admin
    .from('underwriting_runs')
    .update({
      status: runStatus,
      completed_at: hasQueued ? null : new Date().toISOString(),
      error_code: hasFailed ? 'PREFLIGHT_STEP_FAILED' : null,
      error_message: hasFailed ? 'One or more preflight workstreams failed.' : null,
    })
    .eq('id', runId)
    .select('*')
    .single()

  revalidatePath(`/deals/${run.deal_id}`)
  void user
  return { run: updatedRun ?? run, steps: steps ?? [] }
}

