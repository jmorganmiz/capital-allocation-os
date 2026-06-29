import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('critical endpoints fail closed', async () => {
  const digest = await read('app/api/digest/route.ts')
  const parseOm = await read('app/api/parse-om/route.ts')
  const inbox = await read('app/api/inbox/inbound/route.ts')
  assert.doesNotMatch(digest, /if \(!secret\) return true/)
  assert.match(digest, /timingSafeEqual/)
  assert.match(parseOm, /getFirmContext/)
  assert.doesNotMatch(parseOm, /createAdminClient/)
  assert.match(inbox, /getResend\(\)\.webhooks\.verify/)
  assert.match(inbox, /inbound_email_events/)
  assert.match(inbox, /claim_inbound_email_event/)
  assert.match(inbox, /status: 'failed'/)
  assert.match(inbox, /inbound_intake_key/)
})

test('Resend is initialized lazily so builds do not require runtime secrets', async () => {
  const resend = await read('lib/resend.ts')
  assert.doesNotMatch(resend, /export const resend = new Resend/)
  assert.match(resend, /export function getResend/)
  assert.match(resend, /if \(!apiKey\) throw new Error/)
})

test('billing lifecycle failures remain retryable', async () => {
  const checkout = await read('app/api/stripe/checkout/route.ts')
  const webhook = await read('app/api/stripe/webhook/route.ts')
  assert.match(checkout, /subscription_data: \{ metadata: \{ firm_id: firmId \} \}/)
  assert.match(webhook, /customer\.subscription\.deleted/)
  assert.match(webhook, /stripe_subscription_id: deleted \? null/)
  assert.match(webhook, /Webhook processing failed.*status: 500/s)
})

test('resource controls are atomic and bound actual request bytes', async () => {
  const rateLimit = await read('lib/rate-limit.ts')
  const importRoute = await read('app/api/import/deals/import/route.ts')
  const migration = await read('supabase/migrations/014_reliability_hardening.sql')
  assert.match(rateLimit, /rpc\('consume_ai_rate_limit'/)
  assert.doesNotMatch(rateLimit, /count: 'exact'/)
  assert.match(migration, /pg_advisory_xact_lock/)
  assert.match(importRoute, /request\.body\.getReader\(\)/)
  assert.match(importRoute, /MAX_CELL_LENGTH/)
  assert.doesNotMatch(importRoute, /JSON\.stringify\(row\)|sample_deal/)
})

test('database baseline and onboarding rollback are reproducible', async () => {
  const baseline = await read('supabase/migrations/001_initial_schema.sql')
  const rls = await read('supabase/migrations/002_rls_policies.sql')
  const storage = await read('supabase/migrations/003_storage_policies.sql')
  const onboarding = await read('app/onboarding/actions.ts')
  assert.match(baseline, /CREATE TABLE public\.firms/)
  assert.match(baseline, /CREATE TABLE public\.deal_scores/)
  assert.match(rls, /SECURITY DEFINER/)
  assert.match(storage, /storage\.foldername\(name\)/)
  assert.match(onboarding, /firmName\.length > 160/)
  assert.match(onboarding, /await rollbackFirm\(\)/)
})

test('OM parsing uses a supported model and deployable PDF runtime', async () => {
  const parser = await read('lib/parse-om-core.ts')
  const nextConfig = await read('next.config.ts')
  const packageJson = JSON.parse(await read('package.json'))
  assert.match(parser, /claude-sonnet-4-6/)
  assert.doesNotMatch(parser, /claude-sonnet-4-20250514/)
  assert.match(parser, /import\('@napi-rs\/canvas'\)/)
  assert.match(nextConfig, /serverExternalPackages/)
  assert.equal(packageJson.dependencies['@napi-rs/canvas'], '^0.1.80')
})

test('firm inbox addresses use the verified production domain', async () => {
  const originalMigration = await read('supabase/migrations/012_firm_inbox.sql')
  const correction = await read('supabase/migrations/015_correct_inbox_domain.sql')
  assert.doesNotMatch(originalMigration, /inbox\.dealstash\.com/)
  assert.match(originalMigration, /@getdealstash\.com/)
  assert.match(correction, /@getdealstash\.com/)
})
