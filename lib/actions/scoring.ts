'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'

const DEFAULT_CRITERIA = [
  'Location Grade',
  'Tenant Quality',
  'Lease Term Remaining',
  'Debt Coverage Ratio',
  'Cap Rate vs Threshold',
  'Market Demand',
  'Physical Condition',
  'Exit Strategy Clarity',
]

async function seedDefaultCriteria(firmId: string, supabase: any) {
  const rows = DEFAULT_CRITERIA.map((name, i) => ({
    firm_id: firmId,
    name,
    position: i,
    is_active: true,
  }))
  await supabase.from('scoring_criteria').insert(rows)
}

export async function getScoringCriteria() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data, error } = await supabase
    .from('scoring_criteria')
    .select('*')
    .eq('firm_id', profile.firm_id)
    .order('position')

  if (error) return { error: error.message }

  // Auto-seed if empty
  if ((data ?? []).length === 0) {
    await seedDefaultCriteria(profile.firm_id, supabase)
    const { data: seeded } = await supabase
      .from('scoring_criteria')
      .select('*')
      .eq('firm_id', profile.firm_id)
      .order('position')
    return { criteria: seeded ?? [] }
  }

  return { criteria: data ?? [] }
}

// Alias used by settings page — same as getScoringCriteria
export const getAllScoringCriteria = getScoringCriteria

export async function getDealScores(dealId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data, error } = await supabase
    .from('deal_scores')
    .select('*')
    .eq('deal_id', dealId)
    .eq('firm_id', profile.firm_id)

  if (error) return { error: error.message }
  return { scores: data ?? [] }
}

export async function upsertDealScore(
  dealId: string,
  criteriaId: string,
  score: number,
  notes: string | null
) {
  if (score < 1 || score > 5 || !Number.isInteger(score)) {
    return { error: 'Score must be an integer between 1 and 5' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data: existing } = await supabase
    .from('deal_scores')
    .select('id')
    .eq('deal_id', dealId)
    .eq('criteria_id', criteriaId)
    .eq('firm_id', profile.firm_id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('deal_scores')
      .update({ score, notes: notes ?? null, scored_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('deal_scores')
      .insert({
        deal_id:     dealId,
        criteria_id: criteriaId,
        firm_id:     profile.firm_id,
        score,
        notes:       notes ?? null,
        scored_by:   user.id,
      })
    if (error) return { error: error.message }
  }

  revalidatePath(`/deals/${dealId}`)
  return { success: true }
}

export async function createScoringCriteria(name: string, position: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { data, error } = await supabase
    .from('scoring_criteria')
    .insert({ firm_id: profile.firm_id, name, position, is_active: true })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { criteria: data }
}

export async function updateScoringCriteria(id: string, updates: { name?: string; is_active?: boolean; position?: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('scoring_criteria')
    .update(updates)
    .eq('id', id)
    .eq('firm_id', profile.firm_id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function deleteScoringCriteria(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('firm_id').single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('scoring_criteria')
    .delete()
    .eq('id', id)
    .eq('firm_id', profile.firm_id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

// ─── AI Auto-Scoring ──────────────────────────────────────────────────────────

type AutoScoreResult = {
  criteriaCount: number
  scoresWritten: number
  skippedReason?: string
  error?: string
}

export async function autoScoreDeal(dealId: string, firmId: string): Promise<AutoScoreResult> {
  console.log('autoScoreDeal called for deal ID:', dealId, '| firmId:', firmId)
  try {
    const supabase = await createClient()
    console.log('[auto-score] supabase client created')

    const { data: criteria, error: criteriaError } = await supabase
      .from('scoring_criteria')
      .select('id, name, description')
      .eq('firm_id', firmId)
      .eq('is_active', true)
      .order('position')

    if (criteriaError) {
      console.error('[auto-score] failed to fetch criteria:', criteriaError.message, '| code:', criteriaError.code)
      return { criteriaCount: 0, scoresWritten: 0, error: `criteria fetch failed: ${criteriaError.message}` }
    }
    console.log('[auto-score] criteria fetched:', criteria?.length ?? 0)
    if (!criteria || criteria.length === 0) {
      console.log('[auto-score] no active criteria — skipping')
      return { criteriaCount: 0, scoresWritten: 0, skippedReason: 'no active criteria' }
    }

    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('title, market, deal_type, asking_price, property_size, address, deal_structure, financing_type')
      .eq('id', dealId)
      .eq('firm_id', firmId)
      .single()

    if (dealError) {
      console.error('[auto-score] failed to fetch deal:', dealError.message, '| code:', dealError.code)
      return { criteriaCount: criteria.length, scoresWritten: 0, error: `deal fetch failed: ${dealError.message}` }
    }
    if (!deal) {
      console.error('[auto-score] deal not found for id:', dealId)
      return { criteriaCount: criteria.length, scoresWritten: 0, error: 'deal not found' }
    }
    console.log('[auto-score] deal fetched:', deal.title)

    const [{ data: snapshot }, { data: overviewNote }] = await Promise.all([
      supabase
        .from('deal_financial_snapshots')
        .select('purchase_price, noi, cap_rate')
        .eq('deal_id', dealId)
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('deal_notes')
        .select('content')
        .eq('deal_id', dealId)
        .eq('firm_id', firmId)
        .eq('section', 'overview')
        .maybeSingle(),
    ])
    console.log('[auto-score] snapshot:', snapshot ? 'found' : 'none', '| overview note:', overviewNote ? 'found' : 'none')

    const dealContext = [
      `Deal name: ${deal.title}`,
      deal.address        && `Address: ${deal.address}`,
      deal.market         && `Market: ${deal.market}`,
      deal.deal_type      && `Asset type: ${deal.deal_type}`,
      deal.asking_price  !== null && `Asking price: $${Number(deal.asking_price).toLocaleString()}`,
      deal.property_size  && `Property size: ${deal.property_size}`,
      deal.deal_structure && `Deal structure: ${deal.deal_structure}`,
      deal.financing_type && `Financing type: ${deal.financing_type}`,
      snapshot?.noi         != null && `NOI: $${Number(snapshot.noi).toLocaleString()}`,
      snapshot?.cap_rate    != null && `Cap rate: ${Number(snapshot.cap_rate).toFixed(2)}%`,
      snapshot?.purchase_price != null && `Purchase price: $${Number(snapshot.purchase_price).toLocaleString()}`,
      overviewNote?.content && `Property details: ${overviewNote.content}`,
    ].filter(Boolean).join('\n')

    const criteriaText = criteria
      .map(c => `- id: ${c.id} | name: ${c.name}${c.description ? ` | description: ${c.description}` : ''}`)
      .join('\n')

    const apiKey = process.env.ANTHROPIC_API_KEY
    console.log('[auto-score] ANTHROPIC_API_KEY present:', !!apiKey, '| length:', apiKey?.length ?? 0)
    if (!apiKey) {
      console.error('[auto-score] ANTHROPIC_API_KEY is not set — cannot call Claude')
      return { criteriaCount: criteria.length, scoresWritten: 0, error: 'ANTHROPIC_API_KEY not set' }
    }

    const client = new Anthropic({ apiKey })

    console.log('[auto-score] calling Claude...')
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      tool_choice: { type: 'tool', name: 'score_deal' },
      tools: [
        {
          name: 'score_deal',
          description: 'Score a CRE deal on each underwriting criterion.',
          input_schema: {
            type: 'object' as const,
            properties: {
              scores: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    criteria_id: { type: 'string' },
                    score:       { type: 'integer', minimum: 1, maximum: 5 },
                    reasoning:   { type: 'string' },
                  },
                  required: ['criteria_id', 'score', 'reasoning'],
                },
              },
            },
            required: ['scores'],
          },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `You are a CRE underwriting assistant. Score this deal against the firm's criteria.

Rate each criterion 1–5 (1 = very poor, 3 = neutral / insufficient info, 5 = excellent). Keep reasoning to one concise sentence. Default to 3 if there is not enough information to assess a criterion.

Deal:
${dealContext}

Criteria (score every one):
${criteriaText}`,
        },
      ],
    })

    console.log('[auto-score] Claude responded — stop_reason:', msg.stop_reason, '| content blocks:', msg.content.length)

    const toolUse = msg.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      console.error('[auto-score] no tool_use block in response — content:', JSON.stringify(msg.content))
      return { criteriaCount: criteria.length, scoresWritten: 0, error: 'no tool_use block in Claude response' }
    }

    const { scores } = toolUse.input as {
      scores: Array<{ criteria_id: string; score: number; reasoning: string }>
    }
    console.log('[auto-score] scores returned by Claude:', scores?.length ?? 0)
    if (!Array.isArray(scores) || scores.length === 0) {
      console.error('[auto-score] scores array missing or empty — raw input:', JSON.stringify(toolUse.input))
      return { criteriaCount: criteria.length, scoresWritten: 0, error: 'Claude returned empty scores array' }
    }

    // Only insert scores for criteria that actually belong to this firm
    const validIds = new Set(criteria.map(c => c.id))
    const rows = scores
      .filter(s =>
        validIds.has(s.criteria_id) &&
        Number.isInteger(s.score) &&
        s.score >= 1 &&
        s.score <= 5,
      )
      .map(s => ({
        deal_id:     dealId,
        criteria_id: s.criteria_id,
        firm_id:     firmId,
        score:       s.score,
        notes:       s.reasoning || null,
        scored_by:   'ai-auto',
      }))

    console.log('[auto-score] rows to insert:', rows.length, '(filtered from', scores.length, 'returned)')
    if (rows.length === 0) {
      console.warn('[auto-score] all scores filtered out — Claude criteria IDs did not match firm criteria')
      console.warn('[auto-score] Claude criteria_ids:', scores.map(s => s.criteria_id))
      console.warn('[auto-score] valid firm criteria_ids:', [...validIds])
      return { criteriaCount: criteria.length, scoresWritten: 0, error: 'all Claude scores filtered (criteria ID mismatch)' }
    }

    const { error: insertError } = await supabase.from('deal_scores').insert(rows)
    if (insertError) {
      console.error('[auto-score] insert failed:', insertError.message, '| code:', insertError.code, '| hint:', insertError.hint, '| details:', insertError.details)
      return { criteriaCount: criteria.length, scoresWritten: 0, error: `insert failed: ${insertError.message}` }
    }

    console.log('[auto-score] done — inserted', rows.length, 'scores for deal', dealId)
    return { criteriaCount: criteria.length, scoresWritten: rows.length }
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    console.error('[auto-score] uncaught exception:', msg)
    if (err instanceof Error && err.stack) console.error('[auto-score] stack:', err.stack)
    return { criteriaCount: 0, scoresWritten: 0, error: msg }
  }
}
