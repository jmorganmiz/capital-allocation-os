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
  assert.match(inbox, /resend\.webhooks\.verify/)
  assert.match(inbox, /inbound_email_events/)
})
