import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('Supabase migration versions are unique', () => {
  const migrations = fs.readdirSync(path.join(ROOT, 'supabase/migrations'))
    .filter((name) => name.endsWith('.sql'))
  const versions = migrations.map((name) => name.split('_', 1)[0])

  assert.equal(
    new Set(versions).size,
    versions.length,
    `Duplicate migration versions found: ${versions.filter((version, index) => versions.indexOf(version) !== index).join(', ')}`,
  )
})

test('internal panel migration reconciles the historical duplicate 033 state', () => {
  const migration = fs.readFileSync(
    path.join(ROOT, 'supabase/migrations/035_internal_panel.sql'),
    'utf8',
  )

  assert.match(migration, /ADD COLUMN IF NOT EXISTS sender text/)
  assert.match(migration, /inbound_email_events_firm_status_received_idx/)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.internal_users/)
})
