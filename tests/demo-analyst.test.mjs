import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { answerDemoQuestion } from '../lib/demo-analyst.mjs'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('public demo analyst maps free-form questions to product memories', () => {
  assert.equal(answerDemoQuestion('Has Marcus at CBRE sent us anything before?').intent, 'broker')
  assert.equal(answerDemoQuestion('Why does Dallas keep missing our buy box?').intent, 'market')
  assert.equal(answerDemoQuestion('Compare Gaston against similar properties').intent, 'similar')
  assert.equal(answerDemoQuestion('Can you summarize the offering memorandum?').intent, 'om')
  assert.equal(answerDemoQuestion('What does the software cost?').intent, 'pricing')
})

test('public demo analyst is explicitly isolated from private firm data', async () => {
  const [route, component, home, migration] = await Promise.all([
    read('app/api/demo-analyst/route.ts'),
    read('components/LandingAnalyst.tsx'),
    read('app/page.tsx'),
    read('supabase/migrations/019_public_demo_analyst_rate_limit.sql'),
  ])

  assert.match(route, /fictional_sample_data/)
  assert.doesNotMatch(route, /from\('deals'\)|firm_memories|source_answer/)
  assert.match(route, /requestFingerprint/)
  assert.match(route, /consume_demo_analyst_rate/)
  assert.match(route, /fictional sample workspace/)
  assert.match(migration, /GRANT EXECUTE.*service_role/)
  assert.match(migration, /REVOKE ALL.*anon, authenticated/)
  assert.match(component, /Fictional sample data only/)
  assert.match(component, /Start free/)
  assert.match(home, /<LandingAnalyst/)
})
