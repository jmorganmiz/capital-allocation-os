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

export async function autoScoreDeal(dealId: string, firmId: string): Promise<void> {
  try {
    const supabase = await createClient()

    const { data: criteria } = await supabase
      .from('scoring_criteria')
      .select('id, name, description')
      .eq('firm_id', firmId)
      .eq('is_active', true)
      .order('position')

    if (!criteria || criteria.length === 0) return

    const { data: deal } = await supabase
      .from('deals')
      .select('title, market, deal_type, asking_price, property_size, address, deal_structure, financing_type')
      .eq('id', dealId)
      .eq('firm_id', firmId)
      .single()

    if (!deal) return

    const dealContext = [
      `Deal name: ${deal.title}`,
      deal.address        && `Address: ${deal.address}`,
      deal.market         && `Market: ${deal.market}`,
      deal.deal_type      && `Asset type: ${deal.deal_type}`,
      deal.asking_price  !== null && `Asking price: $${Number(deal.asking_price).toLocaleString()}`,
      deal.property_size  && `Property size: ${deal.property_size}`,
      deal.deal_structure && `Deal structure: ${deal.deal_structure}`,
      deal.financing_type && `Financing type: ${deal.financing_type}`,
    ].filter(Boolean).join('\n')

    const criteriaText = criteria
      .map(c => `- id: ${c.id} | name: ${c.name}${c.description ? ` | description: ${c.description}` : ''}`)
      .join('\n')

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

    const toolUse = msg.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') return

    const { scores } = toolUse.input as {
      scores: Array<{ criteria_id: string; score: number; reasoning: string }>
    }
    if (!Array.isArray(scores) || scores.length === 0) return

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

    if (rows.length > 0) {
      const { error } = await supabase.from('deal_scores').insert(rows)
      if (error) {
        console.error('[auto-score] insert failed:', error.message, '| code:', error.code, '| hint:', error.hint)
      }
    }
  } catch (err) {
    console.error('[auto-score] failed:', err instanceof Error ? err.message : err)
  }
}
