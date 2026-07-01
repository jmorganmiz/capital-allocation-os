import Anthropic from '@anthropic-ai/sdk'
import { approvedScoringRules } from '@/lib/firm-memory.mjs'

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

type SupabaseAdmin = any

export async function scoreInboundDeal(
  supabase: SupabaseAdmin,
  dealId: string,
  firmId: string,
): Promise<{ scoresWritten: number; error?: string }> {
  try {
    const criteriaResult = await supabase
      .from('scoring_criteria')
      .select('id, name, description')
      .eq('firm_id', firmId)
      .eq('is_active', true)
      .order('position')
    let criteria = criteriaResult.data
    const criteriaError = criteriaResult.error

    if (criteriaError) return { scoresWritten: 0, error: criteriaError.message }
    if ((criteria ?? []).length === 0) {
      const { error } = await supabase.from('scoring_criteria').insert(
        DEFAULT_CRITERIA.map((name, position) => ({
          firm_id: firmId, name, position, is_active: true,
        })),
      )
      if (error) return { scoresWritten: 0, error: error.message }
      const seeded = await supabase
        .from('scoring_criteria')
        .select('id, name, description')
        .eq('firm_id', firmId)
        .eq('is_active', true)
        .order('position')
      criteria = seeded.data ?? []
    }
    if (!criteria?.length) return { scoresWritten: 0, error: 'No scoring criteria available' }

    const [{ data: deal }, { data: snapshot }, { data: firmMemories }] = await Promise.all([
      supabase
        .from('deals')
        .select('title, address, market, deal_type, asking_price, source_name')
        .eq('id', dealId)
        .eq('firm_id', firmId)
        .single(),
      supabase
        .from('deal_financial_snapshots')
        .select('purchase_price, noi, cap_rate, irr, square_footage, year_built, num_units, occupancy_rate')
        .eq('deal_id', dealId)
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('firm_memories')
        .select('content, feedback_type')
        .eq('firm_id', firmId)
        .eq('feedback_type', 'firm_rule')
        .order('updated_at', { ascending: false })
        .limit(20),
    ])
    if (!deal) return { scoresWritten: 0, error: 'Deal not found' }

    const { data: buyBox } = deal.deal_type
      ? await supabase
          .from('buy_boxes')
          .select('*, buy_box_criteria(*)')
          .eq('firm_id', firmId)
          .eq('asset_type', deal.deal_type)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return { scoresWritten: 0, error: 'ANTHROPIC_API_KEY not set' }

    const context = {
      deal,
      latest_financial_snapshot: snapshot,
      matching_buy_box: buyBox,
      approved_firm_rules: approvedScoringRules(firmMemories ?? []),
      criteria: criteria.map((criterion: any) => ({
        id: criterion.id,
        name: criterion.name,
        description: criterion.description,
      })),
    }
    const client = new Anthropic({ apiKey, timeout: 25_000 })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1800,
      tool_choice: { type: 'tool', name: 'score_deal' },
      tools: [{
        name: 'score_deal',
        description: 'Score every supplied CRE underwriting criterion.',
        input_schema: {
          type: 'object',
          properties: {
            scores: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  criteria_id: { type: 'string' },
                  score: { type: 'integer', minimum: 1, maximum: 5 },
                  reasoning: { type: 'string' },
                },
                required: ['criteria_id', 'score', 'reasoning'],
              },
            },
          },
          required: ['scores'],
        },
      }],
      messages: [{
        role: 'user',
        content: `Score this inbound CRE deal from 1-5 on every criterion. Use 3 when information is insufficient. Apply the matching buy box as the primary rubric, then apply only the approved firm rules supplied in context. Never invent a firm rule. Return every exact criterion ID.\n\n${JSON.stringify(context)}`,
      }],
    })

    const toolUse = message.content.find(block => block.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      return { scoresWritten: 0, error: 'AI did not return structured scores' }
    }
    const returned = (toolUse.input as any).scores
    if (!Array.isArray(returned)) return { scoresWritten: 0, error: 'AI returned invalid scores' }

    const validIds = new Set(criteria.map((criterion: any) => criterion.id))
    const rows = returned
      .filter((score: any) => validIds.has(score.criteria_id) && Number.isInteger(score.score) && score.score >= 1 && score.score <= 5)
      .map((score: any) => ({
        deal_id: dealId,
        criteria_id: score.criteria_id,
        firm_id: firmId,
        score: score.score,
        notes: score.reasoning || null,
        scored_by: null,
      }))
    if (!rows.length) return { scoresWritten: 0, error: 'AI scores did not match firm criteria' }

    await supabase.from('deal_scores').delete().eq('deal_id', dealId).eq('firm_id', firmId).is('scored_by', null)
    const { error: insertError } = await supabase.from('deal_scores').insert(rows)
    return insertError
      ? { scoresWritten: 0, error: insertError.message }
      : { scoresWritten: rows.length }
  } catch (error) {
    return { scoresWritten: 0, error: error instanceof Error ? error.message : 'Unknown scoring error' }
  }
}
