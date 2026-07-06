import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const route = fs.readFileSync(path.join(ROOT, 'app/api/cron/underwriting/route.ts'), 'utf8')
const preflight = fs.readFileSync(path.join(ROOT, 'lib/actions/underwriting-room.ts'), 'utf8')
const full = fs.readFileSync(path.join(ROOT, 'lib/actions/full-underwrite.ts'), 'utf8')
const capability = fs.readFileSync(path.join(ROOT, 'lib/internal/underwriting-worker.ts'), 'utf8')
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'))

test('underwriting cron is authenticated and bounded', () => {
  assert.match(route, /process\.env\.CRON_SECRET/)
  assert.match(route, /timingSafeEqual/)
  assert.match(route, /MAX_RUNS_PER_SWEEP = 8/)
  assert.match(route, /MAX_STEPS_PER_RUN = 12/)
  assert.match(route, /MAX_SWEEP_MS = 45 \* 1000/)
  assert.deepEqual(vercel.crons, [{ path: '/api/cron/underwriting', schedule: '0 5 * * *' }])
})

test('stalled work is requeued atomically and stops after three attempts', () => {
  assert.match(route, /WORKER_STALE_REQUEUED/)
  assert.match(route, /WORKER_STALLED_MAX_ATTEMPTS/)
  assert.match(route, /\.eq\('id', step\.id\)\.eq\('status', 'running'\)/)
  assert.match(route, /step\.attempts >= 3/)
})

test('background processing uses a non-serializable internal capability', () => {
  assert.match(capability, /Symbol\('internal-underwriting-worker'\)/)
  assert.match(preflight, /workerContext === INTERNAL_UNDERWRITING_WORKER/)
  assert.match(full, /workerContext === INTERNAL_UNDERWRITING_WORKER/)
  assert.match(route, /processNextUnderwritingStep\(runId, INTERNAL_UNDERWRITING_WORKER\)/)
  assert.match(route, /processNextFullUnderwriteStep\(runId, INTERNAL_UNDERWRITING_WORKER\)/)
})
