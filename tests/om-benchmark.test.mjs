import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const ROOT = process.cwd()
const script = fs.readFileSync(path.join(ROOT, 'scripts/om-benchmark.mjs'), 'utf8')
const example = JSON.parse(fs.readFileSync(path.join(ROOT, 'validation/om-benchmark/ground-truth.example.json'), 'utf8'))

test('real-OM benchmark fails closed before external document processing', () => {
  assert.match(script, /--consent-external-processing/)
  assert.match(script, /--cases/)
  assert.match(script, /Unknown benchmark cases/)
  assert.match(script, /External processing is disabled/)
  assert.match(script, /citationCoverage/)
  assert.match(script, /falsePositiveCount/)
  assert.equal(example.version, 1)
  assert.equal(Object.keys(example.cases[0].expected).length, 13)
})
