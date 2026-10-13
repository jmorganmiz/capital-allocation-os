import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const route = fs.readFileSync('app/api/deals/[id]/export/xlsx/route.ts', 'utf8')
const helpers = route.slice(route.indexOf('function asNumber('), route.indexOf('function noteBySection('))
const compiled = ts.transpileModule(helpers, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
const { moneyCell, percentCell } = new Function(`${compiled}; return { moneyCell, percentCell }`)()

test('Excel financial cells distinguish missing data from a genuine zero', () => {
  for (const missing of [null, undefined, '', '  ', false, {}, NaN, Infinity]) {
    assert.equal(moneyCell(missing), '')
    assert.equal(percentCell(missing), '')
  }
  assert.equal(moneyCell(0), 0)
  assert.equal(percentCell(0), 0)
  assert.equal(moneyCell('1375000'), 1375000)
  assert.equal(percentCell(0.0628), 0.0628)
  assert.ok(Math.abs(percentCell(6.28) - 0.0628) < 1e-12)
})
