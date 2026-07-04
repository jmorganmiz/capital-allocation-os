import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import test from 'node:test'

const read = (path) => fs.readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('reviewed OM operating facts flow into Quick Pencil without silent heuristic replacement', async () => {
  const parser = await read('lib/parse-om-core.ts')
  const upload = await read('components/pipeline/UploadOMModal.tsx')
  const deals = await read('lib/actions/deals.ts')
  const dealPage = await read('app/(app)/deals/[id]/page.tsx')
  const migration = await read('supabase/migrations/027_snapshot_underwriting_inputs.sql')

  for (const field of ['current_rent', 'market_rent', 'vacancy_rate', 'property_taxes', 'insurance']) {
    assert.match(parser, new RegExp(field))
    assert.match(upload, new RegExp(field))
    assert.match(deals, new RegExp(field))
    assert.match(migration, new RegExp(field))
  }

  assert.match(upload, /These values seed the first underwriting model/)
  assert.match(dealPage, /latestSnapshot\?\.current_rent/)
  assert.match(dealPage, /latestSnapshot\?\.market_rent/)
  assert.match(dealPage, /latestSnapshot\?\.property_taxes/)
  assert.match(dealPage, /latestSnapshot\?\.insurance/)
  assert.match(dealPage, /latestSnapshot\?\.vacancy_rate/)
})
