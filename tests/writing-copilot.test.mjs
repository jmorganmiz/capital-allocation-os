import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const action = fs.readFileSync('lib/actions/writing-copilot.ts', 'utf8')
const component = fs.readFileSync('components/deal/DecisionWritingCopilot.tsx', 'utf8')
const migration = fs.readFileSync('supabase/migrations/029_decision_writing_copilot.sql', 'utf8')
const notes = fs.readFileSync('components/deal/NotesSection.tsx', 'utf8')

test('draft records are firm scoped and client read-only', () => {
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /FOR SELECT USING \(firm_id = public\.current_firm_id\(\)\)/)
  assert.doesNotMatch(migration, /CREATE POLICY[^;]+FOR (INSERT|UPDATE|DELETE)/s)
})

test('evidence drafting is scoped, rate limited, and forced through a structured tool', () => {
  assert.match(action, /eq\('firm_id', context\.firmId\)/)
  assert.match(action, /checkAiRateLimit\(context\.supabase, 'decision-writing-copilot'/)
  assert.match(action, /tool_choice: \{ type: 'tool', name: 'draft_decision_field' \}/)
  assert.match(action, /Never invent a market fact, comparable, assumption, or source/)
  assert.match(action, /validIds = new Set/)
})

test('writing UI requires explicit insertion and preserves the saved edit', () => {
  assert.match(component, /No text is changed until you insert the draft/)
  assert.match(component, /markDecisionDraftInserted/)
  assert.match(component, /Append draft/)
  assert.match(notes, /activeDraftIdRef/)
  assert.match(notes, /upsertDealNote\(dealId, section, value, activeDraftIdRef\.current\)/)
})
