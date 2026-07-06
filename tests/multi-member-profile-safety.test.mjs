import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_ROOTS = ['app', 'components', 'lib']

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(fullPath)
    return /\.(?:ts|tsx)$/.test(entry.name) ? [fullPath] : []
  })
}

test('profile single-row queries are always filtered before execution', () => {
  const violations = []
  for (const root of SOURCE_ROOTS) {
    for (const file of sourceFiles(path.join(ROOT, root))) {
      const source = fs.readFileSync(file, 'utf8')
      const queryPattern = /\.from\(['"]profiles['"]\)([\s\S]{0,320}?)\.single\(\)/g
      for (const match of source.matchAll(queryPattern)) {
        const queryChain = match[1]
        if (!/\.(?:eq|in|match|filter)\(/.test(queryChain)) {
          violations.push(`${path.relative(ROOT, file)}:${source.slice(0, match.index).split('\n').length}`)
        }
      }
    }
  }
  assert.deepEqual(violations, [], `Unfiltered profiles.single() queries break when a firm has multiple members:\n${violations.join('\n')}`)
})
