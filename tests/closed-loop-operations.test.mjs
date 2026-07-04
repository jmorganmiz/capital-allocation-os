import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')
const migration = read('supabase/migrations/024_closed_loop_operations.sql')
const access = read('lib/actions/underwriting-access.ts')
const sourcing = read('lib/actions/sourcing.ts')
const actuals = read('lib/actions/portfolio-actuals.ts')
const quality = read('components/settings/UnderwritingQualityLab.tsx')
const analyst = read('app/api/analyst/route.ts')
const approvalMigration = read('supabase/migrations/025_underwriting_beta_approval.sql')
const platformAdmin = read('lib/actions/platform-admin.ts')
const sourcingPromotion = read('supabase/migrations/026_atomic_sourcing_promotion.sql')

test('every new firm receives a fail-closed core entitlement', () => {
  assert.match(migration, /AFTER INSERT ON public\.firms/)
  assert.match(migration, /VALUES \(NEW\.id, 'core', false, 3, 0\)/)
  assert.match(migration, /ON CONFLICT \(firm_id\) DO NOTHING/)
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.initialize_firm_entitlement/)
})

test('beta enrollment is firm scoped and requires elevated workspace access', () => {
  assert.match(migration, /underwriting_access_requests_select/)
  assert.doesNotMatch(migration, /underwriting_access_requests_insert/)
  assert.match(access, /\['admin', 'partner'\]/)
  assert.match(access, /eq\('firm_id', profile\.firm_id\)/)
  assert.match(access, /status: 'pending'/)
  assert.match(approvalMigration, /FOR UPDATE/)
  assert.match(approvalMigration, /plan_key = 'underwriting_beta', underwriting_enabled = true/)
  assert.match(approvalMigration, /GRANT EXECUTE.*service_role/)
  assert.match(platformAdmin, /isPlatformAdmin/)
})

test('property finder is controlled ingestion with duplicate and buy-box checks', () => {
  assert.match(sourcing, /\['http:', 'https:'\]/)
  assert.doesNotMatch(sourcing, /fetch\(/)
  assert.match(sourcing, /Possible duplicate in firm memory/)
  assert.match(sourcing, /Asset type matches buy box/)
  assert.match(sourcing, /Resolve the possible duplicate before promoting/)
  assert.match(sourcingPromotion, /'sourcing_promoted'/)
  assert.match(sourcingPromotion, /FOR UPDATE/)
  assert.match(sourcingPromotion, /POSSIBLE_DUPLICATE/)
  assert.match(sourcingPromotion, /GRANT EXECUTE.*service_role/)
  assert.match(sourcing, /autoScoreDeal/)
  assert.match(analyst, /from\('sourcing_opportunities'\)/)
  assert.match(analyst, /answerSourcing/)
})

test('actuals preserve the underwritten case and create dated observations', () => {
  assert.match(migration, /UNIQUE \(deal_id, period_date\)/)
  assert.match(migration, /portfolio_actuals_select/)
  assert.doesNotMatch(migration, /portfolio_actuals_insert/)
  assert.match(actuals, /onConflict: 'deal_id,period_date'/)
  assert.match(actuals, /eq\('id', dealId\).*eq\('firm_id', profile\.firm_id\)/s)
  assert.match(analyst, /from\('portfolio_actuals'\)/)
  assert.match(analyst, /answerActuals/)
})

test('OM quality metrics are grounded in analyst-reviewed production facts', () => {
  assert.match(quality, /Production evidence only/)
  assert.match(quality, /metrics\.reviewed \/ metrics\.facts/)
  assert.match(quality, /metrics\.approved \/ metrics\.reviewed/)
  assert.match(quality, /20 real runs/)
})
