import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migration = fs.readFileSync(
  path.join(ROOT, 'supabase/migrations/020_underwriting_foundation.sql'),
  'utf8',
)

test('underwriting records and usage are tenant scoped', () => {
  for (const table of [
    'firm_entitlements',
    'underwriting_runs',
    'underwriting_assumptions',
    'underwriting_approvals',
    'usage_events',
  ]) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i'))
    assert.match(migration, new RegExp(`CREATE POLICY ${table}_select`, 'i'))
  }
  assert.match(migration, /firm_id = public\.current_firm_id\(\)/)
})

test('underwriting mutations fail closed at the client boundary', () => {
  assert.doesNotMatch(migration, /CREATE POLICY underwriting_runs_insert/i)
  assert.doesNotMatch(migration, /CREATE POLICY usage_events_insert/i)
  assert.doesNotMatch(migration, /CREATE POLICY usage_events_update/i)
  assert.doesNotMatch(migration, /CREATE POLICY usage_events_delete/i)
})

test('billable work is idempotent and separately records provider cost', () => {
  assert.match(migration, /UNIQUE \(firm_id, idempotency_key\)/)
  assert.match(migration, /billable_credits numeric/)
  assert.match(migration, /input_tokens bigint/)
  assert.match(migration, /output_tokens bigint/)
  assert.match(migration, /estimated_cost_usd numeric/)
})

test('AI and market assumptions require explicit review states', () => {
  assert.match(migration, /'ai_assumed'/)
  assert.match(migration, /'market_derived'/)
  assert.match(migration, /approval_status text NOT NULL DEFAULT 'needs_review'/)
  assert.match(migration, /decision IN \('approved', 'rejected', 'changes_requested'\)/)
})

