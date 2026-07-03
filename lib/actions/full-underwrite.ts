'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { runUnderwriting, UNDERWRITING_MODEL_VERSION } from '@/lib/underwriting-model.mjs'
import { extractUnderwritingFacts, type ExtractedUnderwritingFact, type UnderwritingDocumentType } from '@/lib/underwriting-extraction'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Json, UnderwritingAssumption, UnderwritingRun, UnderwritingStep } from '@/lib/types/database'

const EXECUTION_VERSION = `full-underwrite-deterministic-${UNDERWRITING_MODEL_VERSION}`

const EXECUTION_STEPS = [
  ['document_evidence', 'Document evidence'],
  ['approved_inputs', 'Document reconciliation'],
  ['model_execution', 'Model execution'],
  ['scenario_reconciliation', 'Scenario reconciliation'],
  ['source_coverage', 'Source coverage'],
  ['exception_review', 'Exception review'],
  ['ic_outputs', 'IC outputs'],
  ['execution_complete', 'Execution complete'],
] as const

const FACT_RANGES: Record<string, [number, number]> = {
  purchasePrice: [1, 10_000_000_000],
  totalUnits: [1, 100_000],
  currentRent: [1, 100_000],
  marketRent: [1, 100_000],
  vacancyPct: [0, 0.5],
  renovationCostPerUnit: [0, 1_000_000],
  propertyTaxes: [0, 1_000_000_000],
  insurance: [0, 1_000_000_000],
  fixedOperatingExpenses: [0, 1_000_000_000],
  ltv: [0, 1],
  interestRate: [0, 0.3],
  amortizationYears: [0, 50],
  interestOnlyMonths: [0, 180],
}

type StepResult = {
  summary: string
  artifact: Json
  evidenceCount: number
  confidence: number
  needsReview?: boolean
  output?: Json
}

async function membership() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' as const }
  const { data: profile } = await supabase.from('profiles').select('firm_id').eq('id', user.id).single()
  if (!profile) return { error: 'Profile not found.' as const }
  return { user, firmId: profile.firm_id }
}

function record(value: Json | null): Record<string, Json> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, Json> : {}
}

function applyApprovedFacts(base: Record<string, Json>, facts: Array<{ assumption_key: string; value: Json }>) {
  const input = structuredClone(base)
  for (const fact of facts) {
    const key = fact.assumption_key.split('::')[0]
    const value = Number(fact.value)
    if (!Number.isFinite(value)) continue
    if (key === 'totalUnits') {
      input.totalUnits = Math.round(value)
      if (Array.isArray(input.unitMix) && input.unitMix.length === 1 && typeof input.unitMix[0] === 'object' && input.unitMix[0]) {
        input.unitMix = [{ ...input.unitMix[0] as Record<string, Json>, units: Math.round(value), unitsToRenovate: Math.round(value) }]
      }
      const unitsPerYear = Number(input.unitsRenovatedPerYear)
      if (Number.isFinite(unitsPerYear)) input.unitsRenovatedPerYear = Math.min(Math.round(value), unitsPerYear)
      continue
    }
    if ((key === 'currentRent' || key === 'marketRent')
      && Array.isArray(input.unitMix) && input.unitMix.length === 1 && typeof input.unitMix[0] === 'object' && input.unitMix[0]) {
      input.unitMix = [{ ...input.unitMix[0] as Record<string, Json>, [key]: value }]
      continue
    }
    input[key === 'fixedOperatingExpenses' ? 'payroll' : key] = value
  }
  return input
}

export async function startFullUnderwrite(
  dealId: string,
  preflightRunId: string,
  requestId: string,
): Promise<{ run?: UnderwritingRun; steps?: UnderwritingStep[]; error?: string }> {
  try {
    if (!dealId || !preflightRunId || !requestId || requestId.length > 200) return { error: 'Invalid request.' }
    const context = await membership()
    if ('error' in context) return context
    const { user, firmId } = context
    const admin = createAdminClient()

    const [{ data: preflight }, { data: entitlement }] = await Promise.all([
      admin.from('underwriting_runs').select('*').eq('id', preflightRunId).eq('deal_id', dealId).eq('firm_id', firmId).eq('run_type', 'preflight').single(),
      admin.from('firm_entitlements').select('underwriting_enabled').eq('firm_id', firmId).single(),
    ])
    if (!entitlement?.underwriting_enabled) return { error: 'Underwriting Pro is not enabled.' }
    if (!preflight?.approved_at || preflight.status !== 'completed') return { error: 'Approve and lock preflight before execution.' }

    const idempotencyKey = `${requestId}:full-underwrite`
    const { data: existing } = await admin.from('underwriting_runs').select('*').eq('firm_id', firmId).eq('idempotency_key', idempotencyKey).maybeSingle()
    if (existing) {
      const { data: steps } = await admin.from('underwriting_steps').select('*').eq('run_id', existing.id).order('position')
      return { run: existing, steps: steps ?? [] }
    }

    const runId = randomUUID()
    const now = new Date().toISOString()
    const { data: run, error: runError } = await admin.from('underwriting_runs').insert({
      id: runId,
      firm_id: firmId,
      deal_id: dealId,
      parent_run_id: preflightRunId,
      run_type: 'full_underwrite',
      scenario_key: 'base',
      status: 'queued',
      assumption_status: 'approved',
      model_version: EXECUTION_VERSION,
      projection_start_date: preflight.projection_start_date,
      input_snapshot: {
        phase: 'deterministic_execution',
        approved_preflight_run_id: preflightRunId,
        locked_preflight: preflight.output_snapshot,
      },
      warnings: [],
      credits_reserved: 0,
      credits_settled: 0,
      idempotency_key: idempotencyKey,
      created_by: user.id,
      started_at: now,
    }).select('*').single()
    if (runError || !run) throw runError ?? new Error('Could not create full underwrite.')

    const { data: steps, error: stepsError } = await admin.from('underwriting_steps').insert(
      EXECUTION_STEPS.map(([stepKey, label], position) => ({
        firm_id: firmId,
        run_id: runId,
        step_key: stepKey,
        label,
        position,
        status: 'queued' as const,
      })),
    ).select('*')
    if (stepsError) throw stepsError
    revalidatePath(`/deals/${dealId}`)
    return { run, steps: steps ?? [] }
  } catch (error) {
    console.error('[full-underwrite] start failed:', error instanceof Error ? error.message : 'unknown error')
    return { error: error instanceof Error ? error.message : 'Could not start full underwrite.' }
  }
}

async function buildResult(
  admin: ReturnType<typeof createAdminClient>,
  run: UnderwritingRun,
  step: UnderwritingStep,
): Promise<StepResult> {
  const runInput = record(run.input_snapshot)
  const locked = record((runInput.locked_preflight ?? null) as Json | null)
  const quick = record((locked.quick_pencil ?? null) as Json | null)
  const modelInput = (quick.input_snapshot ?? null) as Json | null

  if (step.step_key === 'document_evidence') {
    const { data: files } = await admin.from('deal_files').select('id, filename, mime_type, size_bytes, storage_path, created_at').eq('deal_id', run.deal_id).eq('firm_id', run.firm_id).order('created_at')
    const pdfs = (files ?? []).filter((file) => file.mime_type === 'application/pdf' || file.filename.toLowerCase().endsWith('.pdf')).slice(0, 2)
    const extracted: Array<ExtractedUnderwritingFact & {
      file_id: string
      filename: string
      document_type: UnderwritingDocumentType
    }> = []
    for (const file of pdfs) {
      const { data: blob, error: downloadError } = await admin.storage.from('deal-files').download(file.storage_path)
      if (downloadError || !blob) throw downloadError ?? new Error(`Could not download ${file.filename}.`)
      const result = await extractUnderwritingFacts(Buffer.from(await blob.arrayBuffer()), file.filename)
      extracted.push(...result.facts.map((fact) => ({ ...fact, file_id: file.id, filename: file.filename, document_type: result.documentType })))
      await admin.from('usage_events').upsert({
        firm_id: run.firm_id,
        user_id: run.created_by,
        underwriting_run_id: run.id,
        event_type: 'agent_step',
        quantity: 1,
        billable_credits: 0,
        provider: result.provider,
        model: result.model,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        idempotency_key: `${run.id}:${file.id}:cited-extraction`,
        metadata: { filename: file.filename, document_type: result.documentType, facts: result.facts.length, customer_charge: false },
      }, { onConflict: 'firm_id,idempotency_key', ignoreDuplicates: true })
    }
    if (extracted.length) {
      const { error: assumptionError } = await admin.from('underwriting_assumptions').upsert(extracted.map((fact) => ({
        firm_id: run.firm_id,
        run_id: run.id,
        assumption_key: `${fact.key}::${fact.file_id}`,
        label: fact.label,
        category: fact.category,
        value: fact.value,
        unit: fact.unit,
        source_type: 'om_stated',
        source_reference: `${fact.filename} · ${fact.document_type.replaceAll('_', ' ')}${fact.locator ? ` · ${fact.locator}` : ''}`,
        source_excerpt: fact.excerpt,
        confidence: fact.confidence,
        approval_status: 'needs_review',
        created_by: run.created_by,
      })), { onConflict: 'run_id,assumption_key', ignoreDuplicates: true })
      if (assumptionError) throw assumptionError
      await admin.from('underwriting_sources').insert(extracted.map((fact) => ({
        firm_id: run.firm_id,
        run_id: run.id,
        step_id: step.id,
        deal_file_id: fact.file_id,
        source_type: 'deal_file',
        title: fact.filename,
        locator: fact.locator,
        excerpt: fact.excerpt,
        confidence: fact.confidence,
      })))
    }
    return {
      summary: extracted.length ? `${extracted.length} cited fact${extracted.length === 1 ? '' : 's'} await analyst review` : pdfs.length ? 'No supported facts extracted' : 'No PDF source documents linked',
      artifact: {
        documents: (files ?? []).map((file) => ({
          ...file,
          document_type: extracted.find((fact) => fact.file_id === file.id)?.document_type ?? 'unsupported_or_unclassified',
        })),
        extracted_facts: extracted,
        citation_verified: extracted.filter((fact) => fact.citationVerified).length,
      },
      evidenceCount: extracted.filter((fact) => fact.citationVerified).length,
      confidence: extracted.length ? extracted.filter((fact) => fact.citationVerified).length / extracted.length : 0.1,
      needsReview: true,
    }
  }

  if (step.step_key === 'approved_inputs') {
    const assumptions = Array.isArray(locked.assumptions) ? locked.assumptions : []
    const { data: documentFacts } = await admin.from('underwriting_assumptions').select('assumption_key, label, value, approval_status, source_reference').eq('run_id', run.id)
    const groups = new Map<string, typeof documentFacts>()
    for (const fact of documentFacts ?? []) {
      const key = fact.assumption_key.split('::')[0]
      groups.set(key, [...(groups.get(key) ?? []), fact])
    }
    const conflicts = [...groups.entries()].flatMap(([key, candidates]) => {
      const distinct = new Set((candidates ?? []).map((fact) => JSON.stringify(fact.value)))
      return distinct.size > 1 ? [{ key, candidates }] : []
    })
    return {
      summary: conflicts.length ? `${conflicts.length} document conflict${conflicts.length === 1 ? '' : 's'} resolved by analyst decisions` : `${assumptions.length} locked assumptions and ${documentFacts?.length ?? 0} document facts reconciled`,
      artifact: { assumptions, document_facts: documentFacts ?? [], conflicts, approved_at: locked.approved_at ?? null, approved_by: locked.approved_by ?? null },
      evidenceCount: assumptions.length + (documentFacts?.length ?? 0),
      confidence: assumptions.length ? 1 : 0,
      needsReview: assumptions.length === 0,
    }
  }

  if (step.step_key === 'model_execution') {
    if (!modelInput || typeof modelInput !== 'object' || Array.isArray(modelInput)) throw new Error('Locked Quick Pencil model input is missing.')
    const { data: approvedFacts } = await admin.from('underwriting_assumptions').select('assumption_key, value').eq('run_id', run.id).eq('approval_status', 'approved')
    const approvedInput = applyApprovedFacts(modelInput as Record<string, Json>, approvedFacts ?? [])
    const output = runUnderwriting(approvedInput)
    return {
      summary: `Deterministic model completed with ${approvedFacts?.length ?? 0} approved document fact${approvedFacts?.length === 1 ? '' : 's'}`,
      artifact: {
        model_version: output.modelVersion,
        approved_document_facts: approvedFacts ?? [],
        levered_irr: output.leveredIrr,
        equity_multiple: output.equityMultiple,
        year_one_dscr: output.yearOneDscr,
        required_equity: output.totalEquityInvested,
        exit_value: output.grossExitValue,
      },
      output: output as Json,
      evidenceCount: 1,
      confidence: 1,
    }
  }

  const { data: modelStep } = await admin.from('underwriting_steps').select('artifact').eq('run_id', run.id).eq('step_key', 'model_execution').single()
  const output = record((run.output_snapshot ?? modelStep?.artifact ?? null) as Json | null)

  if (step.step_key === 'scenario_reconciliation') {
    const priorOutput = record((quick.output_snapshot ?? null) as Json | null)
    const currentIrr = Number(output.leveredIrr ?? output.levered_irr)
    const priorIrr = Number(priorOutput.leveredIrr)
    const variance = Number.isFinite(currentIrr) && Number.isFinite(priorIrr) ? currentIrr - priorIrr : null
    return {
      summary: variance === null ? 'Prior scenario output unavailable' : `Locked baseline reconciled with ${(variance * 10000).toFixed(0)} bps IRR variance`,
      artifact: { prior_levered_irr: priorIrr, current_levered_irr: currentIrr, variance },
      evidenceCount: variance === null ? 0 : 2,
      confidence: variance === null ? 0.3 : 1,
      needsReview: variance === null || Math.abs(variance) > 0.000001,
    }
  }

  if (step.step_key === 'source_coverage') {
    const assumptions = Array.isArray(locked.assumptions) ? locked.assumptions as Array<Record<string, Json>> : []
    const sourced = assumptions.filter((item) => item.source_reference).length
    return {
      summary: `${sourced} of ${assumptions.length} material assumptions carry source references`,
      artifact: { sourced, total: assumptions.length, coverage: assumptions.length ? sourced / assumptions.length : 0 },
      evidenceCount: sourced,
      confidence: assumptions.length ? sourced / assumptions.length : 0,
      needsReview: sourced < assumptions.length,
    }
  }

  if (step.step_key === 'exception_review') {
    const warnings = Array.isArray(output.warnings) ? output.warnings : []
    return {
      summary: `${warnings.length} disclosed model limitation${warnings.length === 1 ? '' : 's'}`,
      artifact: { warnings, blocking_exceptions: [] },
      evidenceCount: warnings.length,
      confidence: 1,
    }
  }

  if (step.step_key === 'ic_outputs') {
    return {
      summary: 'Core return and debt outputs prepared for IC',
      artifact: {
        levered_irr: output.leveredIrr,
        unlevered_irr: output.unleveredIrr,
        equity_multiple: output.equityMultiple,
        average_cash_on_cash: output.averageCashOnCash,
        year_one_dscr: output.yearOneDscr,
        required_equity: output.totalEquityInvested,
        exit_value: output.grossExitValue,
      },
      evidenceCount: 7,
      confidence: 1,
    }
  }

  const { data: priorSteps } = await admin.from('underwriting_steps').select('label, status').eq('run_id', run.id).lt('position', step.position)
  const blockers = (priorSteps ?? []).filter((item) => item.status === 'needs_review' || item.status === 'failed').map((item) => item.label)
  return {
    summary: blockers.length ? `${blockers.length} workstream${blockers.length === 1 ? '' : 's'} require review` : 'Deterministic execution package complete',
    artifact: { ready: blockers.length === 0, blockers, billable_credits: 0, next_phase: 'cited_document_extraction' },
    evidenceCount: EXECUTION_STEPS.length - 1 - blockers.length,
    confidence: blockers.length ? 0.7 : 1,
    needsReview: blockers.length > 0,
  }
}

export async function processNextFullUnderwriteStep(
  runId: string,
): Promise<{ run?: UnderwritingRun; steps?: UnderwritingStep[]; assumptions?: UnderwritingAssumption[]; error?: string }> {
  try {
    const context = await membership()
    if ('error' in context) return context
    const { user, firmId } = context
    const admin = createAdminClient()
    const { data: run } = await admin.from('underwriting_runs').select('*').eq('id', runId).eq('firm_id', firmId).eq('run_type', 'full_underwrite').single()
    if (!run) return { error: 'Full underwrite not found.' }

    const { data: step } = await admin.from('underwriting_steps').select('*').eq('run_id', runId).eq('status', 'queued').order('position').limit(1).maybeSingle()
    if (!step) {
      const [{ data: steps }, { data: assumptions }] = await Promise.all([
        admin.from('underwriting_steps').select('*').eq('run_id', runId).order('position'),
        admin.from('underwriting_assumptions').select('*').eq('run_id', runId).order('created_at'),
      ])
      return { run, steps: steps ?? [], assumptions: assumptions ?? [] }
    }

    const { data: blocker } = await admin.from('underwriting_steps').select('id').eq('run_id', runId).lt('position', step.position).in('status', ['needs_review', 'failed']).limit(1).maybeSingle()
    if (blocker) {
      const [{ data: steps }, { data: assumptions }] = await Promise.all([
        admin.from('underwriting_steps').select('*').eq('run_id', runId).order('position'),
        admin.from('underwriting_assumptions').select('*').eq('run_id', runId).order('created_at'),
      ])
      return { run: { ...run, status: 'needs_review' }, steps: steps ?? [], assumptions: assumptions ?? [] }
    }

    const now = new Date().toISOString()
    const { data: claimed } = await admin.from('underwriting_steps').update({ status: 'running', attempts: step.attempts + 1, started_at: now }).eq('id', step.id).eq('status', 'queued').select('*').maybeSingle()
    if (!claimed) return { error: 'This workstream was claimed by another worker.' }
    await admin.from('underwriting_runs').update({ status: 'running' }).eq('id', runId)

    try {
      const result = await buildResult(admin, run, claimed)
      if (result.output) await admin.from('underwriting_runs').update({ output_snapshot: result.output }).eq('id', runId)
      await admin.from('underwriting_steps').update({
        status: result.needsReview ? 'needs_review' : 'completed',
        artifact_summary: result.summary,
        artifact: result.artifact,
        evidence_count: result.evidenceCount,
        confidence: result.confidence,
        completed_at: new Date().toISOString(),
      }).eq('id', claimed.id)
    } catch (error) {
      await admin.from('underwriting_steps').update({
        status: 'failed',
        error_code: 'EXECUTION_STEP_FAILED',
        error_message: error instanceof Error ? error.message.slice(0, 500) : 'Unknown execution error',
        completed_at: new Date().toISOString(),
      }).eq('id', claimed.id)
    }

    const { data: steps } = await admin.from('underwriting_steps').select('*').eq('run_id', runId).order('position')
    const queued = (steps ?? []).some((item) => item.status === 'queued' || item.status === 'running')
    const failed = (steps ?? []).some((item) => item.status === 'failed')
    const review = (steps ?? []).some((item) => item.status === 'needs_review')
    const status = failed ? 'failed' : queued ? 'running' : review ? 'needs_review' : 'completed'
    const { data: updatedRun } = await admin.from('underwriting_runs').update({
      status,
      completed_at: queued ? null : new Date().toISOString(),
      error_code: failed ? 'FULL_UNDERWRITE_STEP_FAILED' : null,
      error_message: failed ? 'One or more deterministic workstreams failed.' : null,
    }).eq('id', runId).select('*').single()

    if (status === 'completed') {
      await admin.from('usage_events').upsert({
        firm_id: firmId,
        user_id: user.id,
        underwriting_run_id: runId,
        event_type: 'full_underwrite',
        quantity: 1,
        billable_credits: 0,
        idempotency_key: `${runId}:deterministic-complete`,
        metadata: { phase: 'deterministic_execution', model_version: EXECUTION_VERSION, customer_charge: false },
      }, { onConflict: 'firm_id,idempotency_key', ignoreDuplicates: true })
    }
    revalidatePath(`/deals/${run.deal_id}`)
    const { data: assumptions } = await admin.from('underwriting_assumptions').select('*').eq('run_id', runId).order('created_at')
    return { run: updatedRun ?? run, steps: steps ?? [], assumptions: assumptions ?? [] }
  } catch (error) {
    console.error('[full-underwrite] process failed:', error instanceof Error ? error.message : 'unknown error')
    return { error: error instanceof Error ? error.message : 'Could not process full underwrite.' }
  }
}

export async function reviewExtractedUnderwritingFact(
  runId: string,
  assumptionId: string,
  decision: 'approved' | 'rejected' | 'revised',
  revisedValue?: number,
): Promise<{ run?: UnderwritingRun; steps?: UnderwritingStep[]; assumptions?: UnderwritingAssumption[]; error?: string }> {
  try {
    if (decision === 'revised' && (!Number.isFinite(revisedValue) || revisedValue === undefined)) return { error: 'Enter a valid revised value.' }
    const context = await membership()
    if ('error' in context) return context
    const { user, firmId } = context
    const admin = createAdminClient()
    const { data: run } = await admin.from('underwriting_runs').select('*').eq('id', runId).eq('firm_id', firmId).eq('run_type', 'full_underwrite').single()
    if (!run || run.status === 'completed') return { error: 'This execution is not open for review.' }
    const { data: assumption } = await admin.from('underwriting_assumptions').select('*').eq('id', assumptionId).eq('run_id', runId).eq('firm_id', firmId).single()
    if (!assumption) return { error: 'Extracted fact not found.' }

    const effectiveValue = decision === 'revised' ? Number(revisedValue) : Number(assumption.value)
    const canonicalKey = assumption.assumption_key.split('::')[0]
    const range = FACT_RANGES[canonicalKey]
    if (decision !== 'rejected' && (!Number.isFinite(effectiveValue) || !range || effectiveValue < range[0] || effectiveValue > range[1])) {
      return { error: `${assumption.label} is outside the supported model range.` }
    }
    if (decision !== 'rejected') {
      const { data: conflictingApproved } = await admin.from('underwriting_assumptions')
        .select('id, label, value, source_reference')
        .eq('run_id', runId)
        .eq('approval_status', 'approved')
        .like('assumption_key', `${canonicalKey}::%`)
        .neq('id', assumptionId)
      const conflict = (conflictingApproved ?? []).find((item) => Number(item.value) !== effectiveValue)
      if (conflict) return { error: `A conflicting ${assumption.label.toLowerCase()} is already approved from ${conflict.source_reference ?? 'another document'}. Reject it before approving this value.` }
    }

    const approved = decision !== 'rejected'
    const now = new Date().toISOString()
    const { error: updateError } = await admin.from('underwriting_assumptions').update({
      ...(decision === 'revised' ? {
        value: revisedValue as Json,
        source_type: 'analyst_override',
        source_reference: `Analyst revision of ${assumption.source_reference ?? assumption.label}`,
        confidence: 1,
      } : {}),
      approval_status: approved ? 'approved' : 'rejected',
      approved_by: approved ? user.id : null,
      approved_at: approved ? now : null,
    }).eq('id', assumptionId)
    if (updateError) throw updateError
    await admin.from('underwriting_approvals').insert({
      firm_id: firmId,
      run_id: runId,
      assumption_id: assumptionId,
      decision: decision === 'rejected' ? 'rejected' : 'approved',
      notes: decision === 'revised' ? `Document fact revised from ${String(assumption.value)} to ${String(revisedValue)}.` : null,
      decided_by: user.id,
    })

    const { data: assumptions } = await admin.from('underwriting_assumptions').select('*').eq('run_id', runId).order('created_at')
    const pending = (assumptions ?? []).filter((item) => item.approval_status === 'needs_review').length
    if (pending === 0) {
      const approvedCount = (assumptions ?? []).filter((item) => item.approval_status === 'approved').length
      const rejectedCount = (assumptions ?? []).filter((item) => item.approval_status === 'rejected').length
      await admin.from('underwriting_steps').update({
        status: 'completed',
        artifact_summary: `${approvedCount} document facts approved · ${rejectedCount} rejected`,
        confidence: approvedCount ? 1 : 0.5,
        completed_at: now,
      }).eq('run_id', runId).eq('step_key', 'document_evidence')
    }
    const { data: steps } = await admin.from('underwriting_steps').select('*').eq('run_id', runId).order('position')
    const { data: updatedRun } = await admin.from('underwriting_runs').update({ status: pending ? 'needs_review' : 'running' }).eq('id', runId).select('*').single()
    revalidatePath(`/deals/${run.deal_id}`)
    return { run: updatedRun ?? run, steps: steps ?? [], assumptions: assumptions ?? [] }
  } catch (error) {
    console.error('[full-underwrite] fact review failed:', error instanceof Error ? error.message : 'unknown error')
    return { error: error instanceof Error ? error.message : 'Could not review extracted fact.' }
  }
}

export async function continueWithLockedUnderwritingInputs(
  runId: string,
): Promise<{ run?: UnderwritingRun; steps?: UnderwritingStep[]; error?: string }> {
  try {
    const context = await membership()
    if ('error' in context) return context
    const { user, firmId } = context
    const admin = createAdminClient()
    const { data: run } = await admin.from('underwriting_runs').select('*').eq('id', runId).eq('firm_id', firmId).eq('run_type', 'full_underwrite').single()
    if (!run || run.status === 'completed') return { error: 'This execution is not open for review.' }
    const { count } = await admin.from('underwriting_assumptions').select('id', { count: 'exact', head: true }).eq('run_id', runId).eq('approval_status', 'needs_review')
    if (count) return { error: 'Review the extracted document facts first.' }
    const now = new Date().toISOString()
    await admin.from('underwriting_steps').update({
      status: 'completed',
      artifact_summary: 'No supported facts applied · locked inputs retained',
      confidence: 0.5,
      completed_at: now,
    }).eq('run_id', runId).eq('step_key', 'document_evidence')
    await admin.from('underwriting_approvals').insert({
      firm_id: firmId,
      run_id: runId,
      assumption_id: null,
      decision: 'approved',
      notes: 'Analyst continued with locked preflight inputs because no supported document facts were available.',
      decided_by: user.id,
    })
    const { data: steps } = await admin.from('underwriting_steps').select('*').eq('run_id', runId).order('position')
    const { data: updatedRun } = await admin.from('underwriting_runs').update({ status: 'running' }).eq('id', runId).select('*').single()
    revalidatePath(`/deals/${run.deal_id}`)
    return { run: updatedRun ?? run, steps: steps ?? [] }
  } catch (error) {
    console.error('[full-underwrite] locked-input continuation failed:', error instanceof Error ? error.message : 'unknown error')
    return { error: error instanceof Error ? error.message : 'Could not continue execution.' }
  }
}
