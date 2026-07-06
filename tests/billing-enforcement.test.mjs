import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Platform-admin actions are operator tooling, not customer workspace writes.
const EXEMPT_ACTION_FILES = new Set(['platform-admin.ts'])

test('every customer-facing action module enforces billing access', () => {
  const actionsDir = path.join(ROOT, 'lib', 'actions')
  const missing = fs.readdirSync(actionsDir)
    .filter((name) => name.endsWith('.ts') && !EXEMPT_ACTION_FILES.has(name))
    .filter((name) => !fs.readFileSync(path.join(actionsDir, name), 'utf8').includes('assertFirmAccess('))
  assert.deepEqual(missing, [], `Action modules without a billing gate: ${missing.join(', ')}`)
})

test('shared firm context and AI routes enforce billing access', () => {
  const requireGate = [
    'lib/auth.ts',
    'app/api/analyst/route.ts',
    'app/api/analyst/memory/route.ts',
    'app/api/import/deals/import/route.ts',
  ]
  for (const file of requireGate) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8')
    assert.ok(source.includes('assertFirmAccess('), `${file} must call assertFirmAccess`)
  }
  // These routes inherit the gate through getFirmContext instead.
  for (const file of ['app/api/parse-om/route.ts', 'app/api/import/deals/map-columns/route.ts']) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8')
    assert.ok(source.includes('getFirmContext'), `${file} must resolve callers through getFirmContext`)
  }
})
