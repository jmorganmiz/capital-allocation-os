import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { approvedScoringRules, rankRelevantMemories } from '../lib/firm-memory.mjs'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('analyst memory reuses only relevant approved learning', () => {
  const memories = [
    { id: 'saved', content: 'Dallas multifamily pricing is sensitive above $150k per unit.', feedback_type: 'saved', tags: ['pricing'] },
    { id: 'correction', content: 'Marcus Webb works at CBRE.', feedback_type: 'correction', tags: ['broker'] },
    { id: 'rule', content: 'Dallas cap rates below 5.75% should score no higher than 2.', feedback_type: 'firm_rule', tags: ['market', 'score'] },
    { id: 'negative', content: 'A bad Dallas answer that must not be reused.', feedback_type: 'not_helpful', tags: ['market'] },
    { id: 'helpful', content: 'Helpful click telemetry is not firm knowledge.', feedback_type: 'helpful', tags: ['market'] },
  ]

  const result = rankRelevantMemories('How should we score a Dallas deal?', memories)
  assert.deepEqual(result.map(memory => memory.id), ['rule', 'saved'])
  assert.ok(!result.some(memory => memory.id === 'negative'))
  assert.ok(!result.some(memory => memory.id === 'helpful'))
})

test('only explicit firm rules flow into automatic scoring', () => {
  const rules = approvedScoringRules([
    { content: 'Use a 5.75% Dallas cap-rate floor.', feedback_type: 'firm_rule' },
    { content: 'A saved analyst summary.', feedback_type: 'saved' },
    { content: 'A corrected broker name.', feedback_type: 'correction' },
  ])
  assert.deepEqual(rules, ['Use a 5.75% Dallas cap-rate floor.'])
})

test('learning-loop surfaces are firm-scoped and auditable', async () => {
  const [route, analyst, settings, scoring, inbound] = await Promise.all([
    read('app/api/analyst/memory/route.ts'),
    read('app/api/analyst/route.ts'),
    read('components/settings/FirmMemorySettings.tsx'),
    read('lib/actions/scoring.ts'),
    read('lib/score-inbound.ts'),
  ])

  assert.match(route, /\.eq\('firm_id', profile\.firm_id\)/)
  assert.match(route, /export async function PATCH/)
  assert.match(route, /export async function DELETE/)
  assert.match(analyst, /memoryReferences/)
  assert.match(settings, /Promote to rule/)
  assert.match(settings, /Remove from scoring/)
  assert.match(scoring, /approvedScoringRules/)
  assert.match(inbound, /approved_firm_rules/)
})
