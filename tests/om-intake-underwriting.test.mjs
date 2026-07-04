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

test('deal detail displays normalized percentages and document property size', async () => {
  const financials = await read('components/deal/FinancialSnapshot.tsx')
  const dealInfo = await read('components/deal/DealInfo.tsx')
  const dealPage = await read('app/(app)/deals/[id]/page.tsx')
  const deals = await read('lib/actions/deals.ts')

  assert.match(financials, /\(val \* 100\)\.toFixed\(2\)/)
  assert.match(financials, /parseFloat\(form\.cap_rate\) \/ 100/)
  assert.match(dealInfo, /propertySizeFallback/)
  assert.match(dealInfo, /value \?\? '—'/)
  assert.match(dealPage, /latestSnapshot\?\.square_footage/)
  assert.match(deals, /property_size: params\.propertyDetails\.square_footage/)
})

test('rescoring and preflight evidence remain normalized, relevant, and inspectable', async () => {
  const scoring = await read('lib/actions/scoring.ts')
  const scoringUi = await read('components/deal/ScoringSection.tsx')
  const roomAction = await read('lib/actions/underwriting-room.ts')
  const roomUi = await read('components/deal/UnderwritingRoom.tsx')

  for (const field of ['cap_rate', 'debt_rate', 'ltv', 'irr']) {
    assert.match(scoring, new RegExp(`snapshot\\?\\.${field}[^\\n]+\\* 100`))
  }
  assert.match(scoring, /upsert\(rows, \{ onConflict: 'deal_id,criteria_id' \}\)/)
  assert.match(scoring, /export async function rescoreDeal/)
  assert.match(scoringUi, /Re-score with AI/)
  assert.match(roomAction, /Math\.abs\(candidatePrice - currentPrice\) \/ currentPrice <= 0\.5/)
  assert.match(roomAction, /seen\.has\(duplicateKey\)/)
  assert.match(roomAction, /No relevant comparable firm deals yet/)
  assert.match(roomUi, /app-risk-evidence/)
  assert.match(roomUi, /selectedRiskScores/)
})
