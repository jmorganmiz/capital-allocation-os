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
const action = fs.readFileSync(path.join(ROOT, 'lib/actions/underwriting.ts'), 'utf8')
const quickPencil = fs.readFileSync(path.join(ROOT, 'components/deal/QuickPencil.tsx'), 'utf8')
const roomMigration = fs.readFileSync(
  path.join(ROOT, 'supabase/migrations/021_underwriting_room.sql'),
  'utf8',
)
const preflightMigration = fs.readFileSync(
  path.join(ROOT, 'supabase/migrations/022_preflight_run_type.sql'),
  'utf8',
)
const billingMigration = fs.readFileSync(
  path.join(ROOT, 'supabase/migrations/023_atomic_underwrite_allowance.sql'),
  'utf8',
)
const roomAction = fs.readFileSync(path.join(ROOT, 'lib/actions/underwriting-room.ts'), 'utf8')
const room = fs.readFileSync(path.join(ROOT, 'components/deal/UnderwritingRoom.tsx'), 'utf8')
const fullAction = fs.readFileSync(path.join(ROOT, 'lib/actions/full-underwrite.ts'), 'utf8')
const fullRoom = fs.readFileSync(path.join(ROOT, 'components/deal/FullUnderwriteExecution.tsx'), 'utf8')
const extraction = fs.readFileSync(path.join(ROOT, 'lib/underwriting-extraction.ts'), 'utf8')
const memo = fs.readFileSync(path.join(ROOT, 'lib/ic-memo-pdf.ts'), 'utf8')

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

test('Quick Pencil is recalculated authoritatively and does not consume credits', () => {
  assert.match(action, /runUnderwriting\(modelInput\)/)
  assert.match(action, /profile\.firm_id !== deal\.firm_id/)
  assert.match(action, /createAdminClient\(\)/)
  assert.match(action, /billable_credits: 0/)
  assert.match(action, /credits_settled: 0/)
  assert.match(action, /idempotency_key: `\$\{requestId\}:\$\{scenario\}`/)
})

test('Quick Pencil visibly distinguishes assumptions from approved underwriting', () => {
  assert.match(quickPencil, /No AI assumptions and no credits consumed/)
  assert.match(quickPencil, /saved outputs remain “needs review.”/)
  assert.match(quickPencil, /Needs review/)
  assert.match(quickPencil, /Downside stresses vacancy, rent growth, renovation cost, and exit cap/)
  assert.match(quickPencil, /Every scenario definition is saved with its result/)
  assert.match(action, /interestRate: 0\.0075/)
  assert.match(action, /operatingCosts: 1\.1/)
  assert.match(action, /marketRent: 0\.95/)
})

test('Underwriting Room workstreams are persisted, tenant scoped, and client read-only', () => {
  for (const table of ['underwriting_steps', 'underwriting_sources']) {
    assert.match(roomMigration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i'))
    assert.match(roomMigration, new RegExp(`CREATE POLICY ${table}_select`, 'i'))
    assert.doesNotMatch(roomMigration, new RegExp(`CREATE POLICY ${table}_insert`, 'i'))
  }
  assert.match(roomMigration, /UNIQUE \(run_id, step_key\)/)
  assert.match(roomMigration, /attempts integer NOT NULL DEFAULT 0/)
})

test('Preflight approvals and full executions have distinct version histories', () => {
  assert.match(preflightMigration, /SET run_type = 'preflight'/)
  assert.match(preflightMigration, /'preflight', 'full_underwrite'/)
  assert.match(roomAction, /run_type: 'preflight'/)
})

test('Underwriting Room claims one resumable step and persists structured artifacts', () => {
  assert.match(roomAction, /\.eq\('status', 'queued'\)/)
  assert.match(roomAction, /\.lt\('attempts', 3\)/)
  assert.match(roomAction, /\.eq\('status', next\.status\)/)
  assert.match(roomAction, /artifact_summary: result\.summary/)
  assert.match(roomAction, /underwriting_sources/)
  assert.match(roomAction, /credits_reserved: 0/)
})

test('Assumption review is tenant scoped, auditable, and drives IC readiness', () => {
  assert.match(roomAction, /reviewUnderwritingAssumption/)
  assert.match(roomAction, /prepareUnderwritingAssumptionReview/)
  assert.match(roomAction, /if \(existing\?\.length\) return/)
  assert.match(roomAction, /\.eq\('firm_id', firmId\)/)
  assert.match(roomAction, /underwriting_approvals/)
  assert.match(roomAction, /decision === 'revised'/)
  assert.match(roomAction, /source_reference: 'Analyst revision'/)
  assert.match(roomAction, /assumption_status: allApproved \? 'approved'/)
  assert.match(roomAction, /step_key', 'ic_readiness'/)
  assert.match(room, /Save revision/)
  assert.match(room, /Edit in/)
  assert.match(room, /enteredValue \/ 100/)
})

test('Risk and final preflight approval remain explicit human gates', () => {
  assert.match(roomAction, /approveUnderwritingRiskReview/)
  assert.match(roomAction, /approveUnderwritingPreflight/)
  assert.match(roomAction, /Risk narrative reviewed and approved/)
  assert.match(roomAction, /Final preflight package approved and locked/)
  assert.match(roomAction, /Resolve before final approval/)
  assert.match(roomAction, /output_snapshot: lockedPackage/)
  assert.match(roomAction, /run\.approved_at && run\.status === 'completed'/)
  assert.match(roomAction, /input_snapshot, output_snapshot/)
  assert.match(room, /Save & approve risk review/)
  assert.match(room, /Approve & lock package/)
  assert.match(room, /Deal documents.*section-files/s)
})

test('Full Underwrite execution accepts only locked preflight packages', () => {
  assert.match(fullAction, /eq\('run_type', 'preflight'\)/)
  assert.match(fullAction, /preflight\?\.approved_at/)
  assert.match(fullAction, /p_preflight_run_id: preflightRunId/)
  assert.match(fullAction, /locked_preflight: preflight\.output_snapshot/)
  assert.match(fullAction, /runUnderwriting\(approvedInput\)/)
})

test('Full Underwrite allowance reservation is atomic and revisions are bounded', () => {
  assert.match(fullAction, /eq\('status', 'queued'\)/)
  assert.match(fullAction, /eq\('status', 'queued'\)\.select/)
  assert.match(fullAction, /reserve_full_underwrite_run/)
  assert.match(billingMigration, /FOR UPDATE/)
  assert.match(billingMigration, /UNDERWRITE_ALLOWANCE_EXCEEDED/)
  assert.match(billingMigration, /REVISION_LIMIT_REACHED/)
  assert.match(billingMigration, /v_revision_count >= 3/)
  assert.match(billingMigration, /v_credit := CASE WHEN v_revision_count = 0 THEN 1 ELSE 0 END/)
  assert.match(billingMigration, /SECURITY DEFINER/)
  assert.match(billingMigration, /GRANT EXECUTE ON FUNCTION public\.reserve_full_underwrite_run.*service_role/s)
})

test('Completed work settles reserved credits while failed work releases capacity', () => {
  assert.match(fullAction, /credits_settled: run\.credits_reserved/)
  assert.match(fullAction, /billable_credits: run\.credits_reserved/)
  assert.match(fullAction, /customer_charge: run\.credits_reserved > 0/)
  assert.match(fullAction, /included_revision: run\.credits_reserved === 0/)
  assert.match(billingMigration, /status IN \('failed', 'canceled'\) AND credits_settled = 0/)
  assert.match(fullRoom, /remaining/)
  assert.match(fullRoom, /included revision/)
})

test('Document extraction produces cited proposals and pauses before calculation', () => {
  assert.match(extraction, /citations: \{ enabled: true \}/)
  assert.match(extraction, /citationVerified/)
  assert.match(extraction, /Never estimate or infer a missing value/)
  assert.match(fullAction, /extractUnderwritingFacts/)
  assert.match(fullAction, /approval_status: 'needs_review'/)
  assert.match(fullAction, /input_tokens: result\.inputTokens/)
  assert.match(fullAction, /lt\('position', step\.position\).*needs_review/s)
  assert.match(fullRoom, /Approve cited document facts/)
  assert.match(extraction, /offering_memorandum, rent_roll, t12, debt_quote, other/)
  assert.match(extraction, /fixedOperatingExpenses/)
  assert.match(extraction, /asset_type/)
  assert.match(extraction, /multifamily underwriting facts were suppressed/)
  assert.match(extraction, /Uncited \$\{key\} value was suppressed/)
  assert.match(extraction, /Multiple materially different \$\{key\} values were suppressed/)
  assert.match(extraction, /Never divide a rent total by units/)
  assert.match(extraction, /Never calculate it from line items/)
})

test('Analysts can reject unsupported extraction without silently changing the model', () => {
  assert.match(fullAction, /reviewExtractedUnderwritingFact/)
  assert.match(fullAction, /applyApprovedFacts/)
  assert.match(fullAction, /eq\('approval_status', 'approved'\)/)
  assert.match(fullAction, /continueWithLockedUnderwritingInputs/)
  assert.match(fullAction, /FACT_RANGES/)
  assert.match(fullAction, /assumption_key\.split\('::'\)/)
  assert.match(fullAction, /conflicting .* is already approved/)
  assert.match(fullRoom, /Continue with locked inputs/)
})

test('Completed underwriting produces sensitivities and a sourced IC memo', () => {
  assert.match(fullAction, /exit_cap_shifts/)
  assert.match(fullAction, /rent_growth_shifts/)
  assert.match(fullRoom, /Levered IRR by rent growth and exit cap/)
  assert.match(fullRoom, /Download PDF/)
  assert.match(memo, /SOURCE APPENDIX/)
  assert.match(memo, /Dealstash confidential/)
})

test('Agent visuals expose status and artifacts without pretending to show reasoning', () => {
  assert.match(room, /Truthful progress only/)
  assert.match(room, /Live artifact/)
  assert.match(room, /evidence item/)
  assert.match(room, /confidence/)
  assert.match(room, /Review \$\{reviewCount\}/)
  assert.match(room, /complete .* review/)
  assert.match(room, /className="clear"/)
  assert.match(room, /className="review"/)
  assert.match(room, /Run fresh preflight/)
  assert.doesNotMatch(room, /chain.of.thought/i)
})
