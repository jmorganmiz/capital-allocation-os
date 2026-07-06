'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { checkAiRateLimit } from '@/lib/rate-limit'
import type { Json } from '@/lib/types/database'

export type DecisionSection = 'overview' | 'risks'
export type WritingMode = 'guided' | 'evidence'

export interface WritingEvidence {
  id: string
  label: string
  value: string
  source: string
  confidence: number
}

interface DraftInput {
  dealId: string
  section: DecisionSection
  mode: WritingMode
  currentText?: string
  answers?: Record<string, string>
}

interface DraftOutput {
  draftId?: string
  draft?: string
  evidence?: WritingEvidence[]
  missingQuestions?: string[]
  warnings?: string[]
  error?: string
}

const MODEL = 'claude-haiku-4-5-20251001'

function clean(value: unknown, max = 1600) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function money(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
    : null
}

function percent(value: unknown) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return null
  return `${(Math.abs(amount) <= 1 ? amount * 100 : amount).toFixed(2).replace(/\.00$/, '')}%`
}

function guidedDraft(section: DecisionSection, answers: Record<string, string>) {
  const values = Object.values(answers).map(value => clean(value, 900)).filter(Boolean)
  if (values.length < 2) return null
  if (section === 'overview') {
    return [
      values[0],
      values[1] && `The proposed strategy is ${values[1].replace(/^the proposed strategy is\s*/i, '')}`,
      values[2] && `The opportunity fits the firm's mandate because ${values[2].replace(/^because\s*/i, '')}`,
      values[3] && `The thesis depends on ${values[3].replace(/^the thesis depends on\s*/i, '')}`,
    ].filter(Boolean).join(' ')
  }
  return [
    values[0],
    values[1] && `The potential impact is ${values[1].replace(/^the potential impact is\s*/i, '')}`,
    values[2] && `Current mitigants include ${values[2].replace(/^current mitigants include\s*/i, '')}`,
    values[3] && `Remaining diligence should confirm ${values[3].replace(/^remaining diligence should confirm\s*/i, '')}`,
  ].filter(Boolean).join(' ')
}

async function membership(dealId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: profile } = await supabase.from('profiles').select('firm_id').eq('id', user.id).single()
  if (!profile) return { error: 'Profile not found' as const }
  const { data: deal } = await supabase.from('deals').select('*').eq('id', dealId).eq('firm_id', profile.firm_id).single()
  if (!deal) return { error: 'Deal not found' as const }
  return { supabase, user, firmId: profile.firm_id, deal }
}

export async function generateDecisionDraft(input: DraftInput): Promise<DraftOutput> {
  if (!['overview', 'risks'].includes(input.section)) return { error: 'Unsupported section' }
  if (!['guided', 'evidence'].includes(input.mode)) return { error: 'Unsupported writing mode' }
  const context = await membership(input.dealId)
  if ('error' in context) return { error: context.error }
  const answers = Object.fromEntries(Object.entries(input.answers ?? {}).map(([key, value]) => [key, clean(value, 900)]))
  const currentText = clean(input.currentText, 5000)
  const admin = createAdminClient()

  if (input.mode === 'guided') {
    const draft = guidedDraft(input.section, answers)
    if (!draft) return { error: 'Answer at least two prompts to build a useful draft.' }
    const missingQuestions = Object.values(answers).filter(Boolean).length < 4
      ? ['Complete the remaining prompts before treating this draft as IC-ready.']
      : []
    const { data, error } = await admin.from('decision_writing_drafts').insert({
      firm_id: context.firmId,
      deal_id: input.dealId,
      user_id: context.user.id,
      section: input.section,
      mode: input.mode,
      prompt_answers: answers as Json,
      input_text: currentText || null,
      draft_text: draft,
      missing_questions: missingQuestions,
      warnings: ['Guided draft uses user-entered statements and has not independently verified them.'],
    }).select('id').single()
    if (error || !data) return { error: error?.message ?? 'Could not preserve draft' }
    return { draftId: data.id, draft, evidence: [], missingQuestions, warnings: ['User-entered statements are not independently verified.'] }
  }

  const { data: entitlement } = await context.supabase.from('firm_entitlements').select('underwriting_enabled').eq('firm_id', context.firmId).maybeSingle()
  if (!entitlement?.underwriting_enabled) return { error: 'Evidence-grounded drafting is available with Underwriting Pro.' }
  const rateLimit = await checkAiRateLimit(context.supabase, 'decision-writing-copilot', 5)
  if (!rateLimit.allowed) return { error: rateLimit.error }

  const [{ data: snapshots }, { data: scores }, { data: buyBoxes }, { data: runs }] = await Promise.all([
    admin.from('deal_financial_snapshots').select('*').eq('deal_id', input.dealId).eq('firm_id', context.firmId).order('created_at', { ascending: false }).limit(1),
    admin.from('deal_scores').select('score, notes, scoring_criteria(name)').eq('deal_id', input.dealId).eq('firm_id', context.firmId),
    admin.from('buy_boxes').select('*').eq('firm_id', context.firmId),
    admin.from('underwriting_runs').select('id, run_type, status, assumption_status, output_snapshot, created_at').eq('deal_id', input.dealId).eq('firm_id', context.firmId).eq('status', 'completed').order('created_at', { ascending: false }).limit(4),
  ])

  let sequence = 0
  const evidence: WritingEvidence[] = []
  const add = (label: string, value: unknown, source: string, confidence = 1) => {
    if (value === null || value === undefined || value === '') return
    evidence.push({ id: `E${++sequence}`, label, value: String(value), source, confidence })
  }
  add('Deal name', context.deal.title, 'Deal record')
  add('Address', context.deal.address, 'Deal record')
  add('Market', context.deal.market, 'Deal record')
  add('Asset type', context.deal.deal_type, 'Deal record')
  add('Asking price', money(context.deal.asking_price), 'Deal record')
  add('Property size', context.deal.property_size, 'Deal record')
  const snapshot = snapshots?.[0]
  if (snapshot) {
    add('Purchase price', money(snapshot.purchase_price), 'Latest financial snapshot')
    add('NOI', money(snapshot.noi), 'Latest financial snapshot')
    add('Going-in cap rate', percent(snapshot.cap_rate), 'Latest financial snapshot')
    add('Units', snapshot.num_units, 'Latest financial snapshot')
    add('Occupancy', percent(snapshot.occupancy_rate), 'Latest financial snapshot')
    add('Current rent', money(snapshot.current_rent), 'Latest financial snapshot')
    add('Market rent', money(snapshot.market_rent), 'Latest financial snapshot')
  }
  for (const row of (scores ?? []) as any[]) {
    add(`${row.scoring_criteria?.name ?? 'Criterion'} score`, `${row.score}/5${row.notes ? ` — ${clean(row.notes, 240)}` : ''}`, 'Firm scoring', .8)
  }
  const matchingBuyBox = (buyBoxes ?? []).find(box => box.asset_type?.toLowerCase() === context.deal.deal_type?.toLowerCase()) ?? buyBoxes?.[0]
  if (matchingBuyBox) {
    add('Buy box', matchingBuyBox.name, 'Firm buy box')
    add('Minimum cap rate', percent(matchingBuyBox.min_cap_rate), 'Firm buy box')
    add('Maximum asking price', money(matchingBuyBox.max_asking_price), 'Firm buy box')
    add('Preferred markets', matchingBuyBox.preferred_markets, 'Firm buy box')
  }
  const latestRun = runs?.[0]
  if (latestRun) add('Completed underwriting package', `${latestRun.run_type} completed ${new Date(latestRun.created_at).toLocaleDateString('en-US')}`, 'Underwriting run', .9)

  if (evidence.length < 3) return { error: 'There is not enough verified deal evidence to draft this section yet.' }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { error: 'AI drafting is not configured.' }
  const client = new Anthropic({ apiKey, timeout: 25_000 })
  const sectionInstruction = input.section === 'overview'
    ? 'Write a concise investment thesis: opportunity, strategy, fit, and the conditions required for success.'
    : 'Write a concise risk narrative: principal risks, potential impact, existing mitigants, and unresolved diligence.'
  const prompt = `You are an institutional CRE decision-writing assistant. ${sectionInstruction}

Hard rules:
- Use ONLY the evidence items below and clearly identified user context.
- Never invent a market fact, comparable, assumption, or source.
- Never present a missing fact as known. Put it in missing_questions instead.
- Use evidence IDs exactly as provided in used_evidence_ids.
- Keep the draft under 180 words. Write plain, decision-useful prose.
- If the current text contains unsupported claims, include a warning rather than repeating them as fact.

Current field text (may be empty; it is not verified evidence): ${currentText || '(empty)'}
User context (may be used only as management/analyst judgment): ${JSON.stringify(answers)}
Verified firm-scoped evidence:
${evidence.map(item => `${item.id} | ${item.label}: ${item.value} | source: ${item.source}`).join('\n')}`
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    tool_choice: { type: 'tool', name: 'draft_decision_field' },
    tools: [{
      name: 'draft_decision_field',
      description: 'Return a grounded decision draft and its evidence trail.',
      input_schema: {
        type: 'object' as const,
        properties: {
          draft: { type: 'string' },
          used_evidence_ids: { type: 'array', items: { type: 'string' } },
          missing_questions: { type: 'array', items: { type: 'string' } },
          warnings: { type: 'array', items: { type: 'string' } },
        },
        required: ['draft', 'used_evidence_ids', 'missing_questions', 'warnings'],
      },
    }],
    messages: [{ role: 'user', content: prompt }],
  })
  const toolUse = message.content.find(block => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') return { error: 'The drafting model returned no inspectable result.' }
  const result = toolUse.input as { draft?: string; used_evidence_ids?: string[]; missing_questions?: string[]; warnings?: string[] }
  const draft = clean(result.draft, 3000)
  if (!draft) return { error: 'The drafting model returned an empty draft.' }
  const validIds = new Set(evidence.map(item => item.id))
  const usedEvidence = evidence.filter(item => (result.used_evidence_ids ?? []).filter(id => validIds.has(id)).includes(item.id))
  const missingQuestions = (result.missing_questions ?? []).map(item => clean(item, 300)).filter(Boolean).slice(0, 6)
  const warnings = (result.warnings ?? []).map(item => clean(item, 300)).filter(Boolean).slice(0, 6)
  const { data: saved, error } = await admin.from('decision_writing_drafts').insert({
    firm_id: context.firmId,
    deal_id: input.dealId,
    user_id: context.user.id,
    section: input.section,
    mode: input.mode,
    prompt_answers: answers as Json,
    input_text: currentText || null,
    draft_text: draft,
    evidence: usedEvidence as unknown as Json,
    missing_questions: missingQuestions,
    warnings,
    source_run_id: latestRun?.id ?? null,
    model: MODEL,
  }).select('id').single()
  if (error || !saved) return { error: error?.message ?? 'Could not preserve draft' }
  return { draftId: saved.id, draft, evidence: usedEvidence, missingQuestions, warnings }
}

export async function markDecisionDraftInserted(draftId: string, insertedText: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase.from('profiles').select('firm_id').eq('id', user.id).single()
  if (!profile) return { error: 'Profile not found' }
  const admin = createAdminClient()
  const { error } = await admin.from('decision_writing_drafts').update({
    inserted_at: new Date().toISOString(), inserted_by: user.id, inserted_text: clean(insertedText, 12000),
  }).eq('id', draftId).eq('firm_id', profile.firm_id).eq('user_id', user.id)
  return error ? { error: error.message } : { success: true }
}
