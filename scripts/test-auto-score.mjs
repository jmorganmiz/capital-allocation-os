/**
 * Standalone test for the autoScoreDeal logic.
 * Run with: node --env-file=.env.local scripts/test-auto-score.mjs
 *
 * Uses the service role key so no cookie/auth context is needed.
 * Picks the first available deal automatically, or pass a deal ID as the first argument:
 *   node --env-file=.env.local scripts/test-auto-score.mjs <deal-id>
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// ── 1. Validate env vars ───────────────────────────────────────────────────────

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

console.log('\n=== autoScoreDeal test ===')
console.log('NEXT_PUBLIC_SUPABASE_URL     :', SUPABASE_URL ? '✓ set' : '✗ MISSING')
console.log('SUPABASE_SERVICE_ROLE_KEY    :', SERVICE_ROLE_KEY ? `✓ set (length ${SERVICE_ROLE_KEY.length})` : '✗ MISSING')
console.log('ANTHROPIC_API_KEY            :', ANTHROPIC_API_KEY ? `✓ set (length ${ANTHROPIC_API_KEY.length}, prefix ${ANTHROPIC_API_KEY.slice(0, 7)})` : '✗ MISSING')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
  console.error('\nAbort: one or more required env vars are missing.')
  process.exit(1)
}

// ── 2. Clients ─────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

// ── 3. Resolve deal ID ─────────────────────────────────────────────────────────

let dealId = process.argv[2] ?? null

if (!dealId) {
  console.log('\nNo deal ID supplied — fetching the most recently created deal...')
  const { data, error } = await supabase
    .from('deals')
    .select('id, title, firm_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    console.error('Failed to fetch a deal:', error?.message ?? 'no rows returned')
    process.exit(1)
  }

  dealId = data.id
  console.log('Using deal:', data.id, '|', data.title, '| firm:', data.firm_id)
}

// ── 4. Fetch deal ──────────────────────────────────────────────────────────────

console.log('\n--- Fetching deal', dealId, '---')
const { data: deal, error: dealError } = await supabase
  .from('deals')
  .select('id, title, firm_id, market, deal_type, asking_price, property_size, address, deal_structure, financing_type')
  .eq('id', dealId)
  .single()

if (dealError || !deal) {
  console.error('Failed to fetch deal:', dealError?.message ?? 'not found')
  process.exit(1)
}
console.log('Deal:', JSON.stringify(deal, null, 2))

const firmId = deal.firm_id

// ── 5. Fetch scoring criteria ──────────────────────────────────────────────────

console.log('\n--- Fetching active scoring criteria for firm', firmId, '---')
const { data: criteria, error: criteriaError } = await supabase
  .from('scoring_criteria')
  .select('id, name, description')
  .eq('firm_id', firmId)
  .eq('is_active', true)
  .order('position')

if (criteriaError) {
  console.error('Failed to fetch criteria:', criteriaError.message, '| code:', criteriaError.code)
  process.exit(1)
}
console.log('Criteria:', criteria?.length ?? 0, 'active')
criteria?.forEach(c => console.log(' -', c.id, '|', c.name))

if (!criteria || criteria.length === 0) {
  console.error('No active criteria — seed them in Settings before running this test.')
  process.exit(1)
}

// ── 6. Build prompt context ────────────────────────────────────────────────────

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

console.log('\nDeal context being sent to Claude:\n' + dealContext)
console.log('\nCriteria being sent to Claude:\n' + criteriaText)

// ── 7. Call Claude ─────────────────────────────────────────────────────────────

console.log('\n--- Calling Claude (claude-haiku-4-5) ---')
let msg
try {
  msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    tool_choice: { type: 'tool', name: 'score_deal' },
    tools: [
      {
        name: 'score_deal',
        description: 'Score a CRE deal on each underwriting criterion.',
        input_schema: {
          type: 'object',
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
} catch (err) {
  console.error('Claude API call failed:', err?.message ?? err)
  if (err?.status)  console.error('HTTP status:', err.status)
  if (err?.error)   console.error('API error body:', JSON.stringify(err.error))
  process.exit(1)
}

console.log('stop_reason:', msg.stop_reason)
console.log('content blocks:', msg.content.length)
console.log('raw content:', JSON.stringify(msg.content, null, 2))

// ── 8. Extract scores ──────────────────────────────────────────────────────────

const toolUse = msg.content.find(b => b.type === 'tool_use')
if (!toolUse) {
  console.error('\nNo tool_use block returned — scoring cannot proceed.')
  process.exit(1)
}

const { scores } = toolUse.input
console.log('\nScores returned by Claude:', scores?.length ?? 0)
console.log(JSON.stringify(scores, null, 2))

// ── 9. Validate scores ─────────────────────────────────────────────────────────

const validIds = new Set(criteria.map(c => c.id))
const rows = (scores ?? []).filter(s =>
  validIds.has(s.criteria_id) &&
  Number.isInteger(s.score) &&
  s.score >= 1 &&
  s.score <= 5,
).map(s => ({
  deal_id:     dealId,
  criteria_id: s.criteria_id,
  firm_id:     firmId,
  score:       s.score,
  notes:       s.reasoning || null,
  scored_by:   'ai-auto',
}))

const filtered = (scores ?? []).filter(s => !validIds.has(s.criteria_id))
if (filtered.length > 0) {
  console.warn('\nWARNING: Claude returned', filtered.length, 'criteria IDs not in this firm\'s criteria:')
  filtered.forEach(s => console.warn(' -', s.criteria_id))
}

console.log('\nRows to insert:', rows.length, '(of', scores?.length ?? 0, 'returned)')

if (rows.length === 0) {
  console.error('Nothing to insert — check criteria ID mismatch above.')
  process.exit(1)
}

// ── 10. Insert into deal_scores ────────────────────────────────────────────────

console.log('\n--- Inserting into deal_scores ---')
const { error: insertError, data: inserted } = await supabase
  .from('deal_scores')
  .insert(rows)
  .select()

if (insertError) {
  console.error('Insert failed!')
  console.error('  message :', insertError.message)
  console.error('  code    :', insertError.code)
  console.error('  hint    :', insertError.hint)
  console.error('  details :', insertError.details)
  process.exit(1)
}

console.log('Insert succeeded! Rows written:', inserted?.length ?? rows.length)
inserted?.forEach(r => console.log(' -', r.criteria_id, '| score:', r.score, '| scored_by:', r.scored_by))

console.log('\n=== Test complete ===\n')
