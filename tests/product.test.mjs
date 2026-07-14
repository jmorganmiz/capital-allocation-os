import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('intake is user-visible, tenant-scoped, and automatically scored', async () => {
  const [page, route, migration, navigation] = await Promise.all([
    read('app/(app)/intake/page.tsx'),
    read('app/api/inbox/inbound/route.ts'),
    read('supabase/migrations/016_product_workflow.sql'),
    read('components/layout/MobileSidebar.tsx'),
  ])
  assert.match(page, /InboxAddressCard/)
  assert.match(page, /inbound_email_events/)
  assert.match(route, /scoreInboundDeal/)
  assert.match(route, /firm_id: firm\.id/)
  assert.match(migration, /Firm members can view inbound email status/)
  assert.match(navigation, /href: '\/intake'/)
})

test('email intake exposes firm-scoped health, safe retries, and operational metadata', async () => {
  const [page, healthLog, retryAction, route, migration] = await Promise.all([
    read('app/(app)/intake/page.tsx'),
    read('components/intake/IntakeHealthLog.tsx'),
    read('lib/actions/intake.ts'),
    read('app/api/inbox/inbound/route.ts'),
    read('supabase/migrations/033_inbound_email_observability.sql'),
  ])

  assert.match(page, /IntakeHealthLog/)
  assert.match(page, /Intake success rate/)
  assert.match(healthLog, /Email intake log/)
  assert.match(healthLog, /retryInboundEmail/)
  assert.match(retryAction, /\.eq\('firm_id', profile\.firm_id\)/)
  assert.match(retryAction, /event\.status !== 'failed'/)
  assert.match(retryAction, /MAX_RETRY_ATTEMPTS/)
  assert.match(route, /sender: payload\.from/)
  assert.match(route, /deal_ids: createdDeals\.map/)
  assert.match(route, /failInboundEvent\(supabase, emailId, 'no_pdf_attachment'\)/)
  assert.match(migration, /Message bodies and attachment contents are/)
  assert.match(migration, /inbound_email_events_firm_status_received_idx/)
})


test('deal creation usage events power firm activation pulse', async () => {
  const [dashboard, intake, helper, deals, inbound, imports, sourcing, migration] = await Promise.all([
    read('app/(app)/dashboard/page.tsx'),
    read('app/(app)/intake/page.tsx'),
    read('lib/usage-events.ts'),
    read('lib/actions/deals.ts'),
    read('app/api/inbox/inbound/route.ts'),
    read('app/api/import/deals/import/route.ts'),
    read('lib/actions/sourcing.ts'),
    read('supabase/migrations/034_deal_usage_events.sql'),
  ])

  assert.match(helper, /recordDealCreatedUsage/)
  assert.match(helper, /event_type: 'deal_created'/)
  assert.match(dashboard, /Activation pulse/)
  assert.match(dashboard, /Deals parsed per firm per week/)
  assert.match(intake, /Deals parsed/)
  assert.match(deals, /source: 'manual'/)
  assert.match(deals, /source: 'upload'/)
  assert.match(inbound, /source: 'email'/)
  assert.match(imports, /source: 'csv_import'/)
  assert.match(sourcing, /source: 'property_finder'/)
  assert.match(migration, /usage_events_firm_event_created_idx/)
})

test('trial lifecycle is enforced by the application shell', async () => {
  const [layout, gate, migration] = await Promise.all([
    read('app/(app)/layout.tsx'),
    read('components/billing/AccessGate.tsx'),
    read('supabase/migrations/016_product_workflow.sql'),
  ])
  assert.match(layout, /trial_ends_at/)
  assert.match(layout, /stripe_subscription_status/)
  assert.match(layout, /<AccessGate/)
  assert.match(gate, /Trial complete/)
  assert.match(migration, /interval '30 days'/)
  assert.match(migration, /interval '7 days'/)
})

test('navigation and public copy match the released inbox workflow', async () => {
  const [home, navigation, proxy] = await Promise.all([
    read('app/page.tsx'),
    read('components/layout/MobileSidebar.tsx'),
    read('proxy.ts'),
  ])
  assert.doesNotMatch(home, /Firm deal inbox with AI intake[\s\S]{0,120}coming soon/i)
  assert.doesNotMatch(navigation, /Import Deals/)
  assert.match(proxy, /'\/intake'/)
  assert.match(proxy, /'\/import'/)
})
