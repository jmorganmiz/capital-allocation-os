import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const source = fs.readFileSync('app/api/inbox/inbound/route.ts', 'utf8')
const section = source.slice(source.indexOf('async function processAttachment('), source.indexOf('// ── Notification email'))
const compiled = ts.transpileModule(section, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
const parsed = { address: 'Test asset', asking_price: 1000000, noi: 60000, cap_rate: 0.06,
  irr: null, square_footage: null, year_built: null, num_units: 8, occupancy_rate: 0.95,
  current_rent: 1200, market_rent: 1400, vacancy_rate: 0.05, property_taxes: 10000, insurance: 5000 }

function harness(failTable, parseFails = false) {
  const records = new Map()
  let failure = failTable
  const client = {
    storage: { from: () => ({ upload: async () => ({ error: null }) }) },
    from(table) {
      let operation = 'read', row, filters = []
      const query = {
        select() { return query },
        eq(key, value) { filters.push([key, value]); return query },
        limit() { return query },
        insert(value) { operation = 'insert'; row = value; return query },
        upsert(value) { operation = 'upsert'; row = value; return query },
        single() { return execute() },
        maybeSingle() { return execute() },
        then(resolve, reject) { return execute().then(resolve, reject) },
      }
      async function execute() {
        const rows = records.get(table) ?? []
        if (operation === 'read') return { data: rows.find(r => filters.every(([k, v]) => r[k] === v)) ?? null, error: null }
        if (failure === table) { failure = null; return { data: null, error: new Error('Injected persistence failure') } }
        const existing = row.id && rows.find(r => r.id === row.id)
        const saved = existing ?? { id: `${table}-${rows.length}`, ...row }
        if (!existing) rows.push(saved)
        records.set(table, rows)
        return { data: saved, error: null }
      }
      return query
    },
  }
  const process = new Function('createHash', 'parseOMBuffer', 'scoreInboundDeal', 'recordDealCreatedUsage',
    `${compiled}; return processAttachment`)(createHash,
    async () => parseFails ? { error: 'parse_failed' } : { data: parsed },
    async () => ({ scoresWritten: 0 }), async () => {})
  return { records, run: () => process({ supabase: client, firmId: 'firm', stageId: 'stage', actorId: 'user',
    attachment: { filename: 'om.pdf', content: Buffer.from('pdf').toString('base64') },
    payload: { from: 'broker@example.com', subject: 'OM' }, intakeKey: 'stable-key' }) }
}

for (const table of ['deal_financial_snapshots', 'deal_files']) {
  test(`retry repairs ${table} failure without duplicate deals or overwriting saved financials`, async () => {
    const h = harness(table)
    await assert.rejects(h.run(), /Injected persistence failure/)
    assert.equal(h.records.get('deals').length, 1)
    if (table === 'deal_files') h.records.get('deal_financial_snapshots')[0].noi = 70000
    await h.run()
    await h.run()
    assert.equal(h.records.get('deals').length, 1)
    assert.equal(h.records.get('deal_files').length, 1)
    assert.equal(h.records.get('deal_financial_snapshots').length, 1)
    const snapshot = h.records.get('deal_financial_snapshots')[0]
    assert.equal(snapshot.noi, table === 'deal_files' ? 70000 : 60000)
    assert.equal(snapshot.current_rent, 1200)
  })
}

test('failed parsing rejects intake before creating an incomplete deal', async () => {
  const h = harness(null, true)
  await assert.rejects(h.run(), /OM parsing failed/)
  assert.equal(h.records.has('deals'), false)
})
