import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const FIELD_KEYS = [
  'purchasePrice', 'totalUnits', 'currentRent', 'marketRent', 'vacancyPct',
  'renovationCostPerUnit', 'propertyTaxes', 'insurance', 'fixedOperatingExpenses',
  'ltv', 'interestRate', 'amortizationYears', 'interestOnlyMonths',
]
const PERCENT_FIELDS = new Set(['vacancyPct', 'ltv', 'interestRate'])
const INTEGER_FIELDS = new Set(['totalUnits', 'amortizationYears', 'interestOnlyMonths'])
const DEFAULT_TOLERANCE = { moneyRelative: 0.01, percentAbsolute: 0.001, integerAbsolute: 0 }

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

function fail(message) {
  console.error(`OM benchmark: ${message}`)
  process.exitCode = 1
}

function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) throw new Error(`Manifest not found: ${manifestPath}`)
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (manifest.version !== 1 || !Array.isArray(manifest.cases) || manifest.cases.length === 0) {
    throw new Error('Manifest must use version 1 and include at least one case.')
  }
  const ids = new Set()
  for (const item of manifest.cases) {
    if (!item.id || !item.file || !item.documentType || !item.expected) throw new Error('Every case requires id, file, documentType, and expected.')
    if (ids.has(item.id)) throw new Error(`Duplicate case id: ${item.id}`)
    ids.add(item.id)
    const missing = FIELD_KEYS.filter((key) => !(key in item.expected))
    if (missing.length) throw new Error(`${item.id} is missing expected fields: ${missing.join(', ')}`)
    const absoluteFile = path.resolve(path.dirname(manifestPath), item.file)
    if (!fs.existsSync(absoluteFile)) throw new Error(`${item.id} document not found: ${absoluteFile}`)
    if (path.extname(absoluteFile).toLowerCase() !== '.pdf') throw new Error(`${item.id} must reference a PDF.`)
    item.absoluteFile = absoluteFile
  }
  return manifest
}

function isCorrect(key, expected, actual, tolerance) {
  if (expected == null) return actual == null
  if (actual == null || !Number.isFinite(Number(actual))) return false
  const expectedNumber = Number(expected)
  const actualNumber = Number(actual)
  if (PERCENT_FIELDS.has(key)) return Math.abs(actualNumber - expectedNumber) <= tolerance.percentAbsolute
  if (INTEGER_FIELDS.has(key)) return Math.abs(actualNumber - expectedNumber) <= tolerance.integerAbsolute
  if (expectedNumber === 0) return Math.abs(actualNumber) <= 1
  return Math.abs(actualNumber - expectedNumber) / Math.abs(expectedNumber) <= tolerance.moneyRelative
}

function scoreCase(item, extraction, durationMs) {
  const tolerance = { ...DEFAULT_TOLERANCE, ...(item.tolerances ?? {}) }
  const factsByKey = new Map(extraction.facts.map((fact) => [fact.key, fact]))
  const fields = FIELD_KEYS.map((key) => {
    const fact = factsByKey.get(key)
    const expected = item.expected[key]
    const actual = fact?.value ?? null
    return {
      key,
      expected,
      actual,
      correct: isCorrect(key, expected, actual, tolerance),
      citationVerified: fact?.citationVerified ?? false,
      confidence: fact?.confidence ?? null,
    }
  })
  const supported = fields.filter((field) => field.expected != null)
  const extracted = supported.filter((field) => field.actual != null)
  const correct = supported.filter((field) => field.correct)
  const falsePositives = fields.filter((field) => field.expected == null && field.actual != null)
  const cited = extraction.facts.filter((fact) => fact.citationVerified)
  return {
    id: item.id,
    file: path.basename(item.absoluteFile),
    expectedDocumentType: item.documentType,
    actualDocumentType: extraction.documentType,
    documentTypeCorrect: extraction.documentType === item.documentType,
    durationMs,
    inputTokens: extraction.inputTokens,
    outputTokens: extraction.outputTokens,
    expectedFieldCount: supported.length,
    extractedExpectedFieldCount: extracted.length,
    correctFieldCount: correct.length,
    falsePositiveCount: falsePositives.length,
    citationCoverage: extraction.facts.length ? cited.length / extraction.facts.length : 0,
    fields,
  }
}

function aggregate(results, pricing) {
  const totals = results.reduce((sum, result) => ({
    expected: sum.expected + result.expectedFieldCount,
    extracted: sum.extracted + result.extractedExpectedFieldCount,
    correct: sum.correct + result.correctFieldCount,
    falsePositives: sum.falsePositives + result.falsePositiveCount,
    inputTokens: sum.inputTokens + result.inputTokens,
    outputTokens: sum.outputTokens + result.outputTokens,
    durationMs: sum.durationMs + result.durationMs,
    citations: sum.citations + result.citationCoverage,
    documentTypes: sum.documentTypes + Number(result.documentTypeCorrect),
  }), { expected: 0, extracted: 0, correct: 0, falsePositives: 0, inputTokens: 0, outputTokens: 0, durationMs: 0, citations: 0, documentTypes: 0 })
  const estimatedCostUsd = pricing?.inputUsdPerMillion != null && pricing?.outputUsdPerMillion != null
    ? (totals.inputTokens / 1_000_000) * pricing.inputUsdPerMillion + (totals.outputTokens / 1_000_000) * pricing.outputUsdPerMillion
    : null
  return {
    cases: results.length,
    fieldRecall: totals.expected ? totals.extracted / totals.expected : 0,
    fieldAccuracy: totals.expected ? totals.correct / totals.expected : 0,
    falsePositiveCount: totals.falsePositives,
    citationCoverage: results.length ? totals.citations / results.length : 0,
    documentTypeAccuracy: results.length ? totals.documentTypes / results.length : 0,
    averageLatencyMs: results.length ? totals.durationMs / results.length : 0,
    inputTokens: totals.inputTokens,
    outputTokens: totals.outputTokens,
    estimatedCostUsd,
  }
}

function pct(value) {
  return `${(value * 100).toFixed(1)}%`
}

function markdownReport(report) {
  const summary = report.summary
  const rows = report.results.map((item) => `| ${item.id} | ${item.correctFieldCount}/${item.expectedFieldCount} | ${item.falsePositiveCount} | ${pct(item.citationCoverage)} | ${(item.durationMs / 1000).toFixed(1)}s |`).join('\n')
  return `# OM benchmark\n\nGenerated: ${report.generatedAt}\n\n| Metric | Result |\n|---|---:|\n| Cases | ${summary.cases} |\n| Field recall | ${pct(summary.fieldRecall)} |\n| Field accuracy | ${pct(summary.fieldAccuracy)} |\n| False positives | ${summary.falsePositiveCount} |\n| Citation coverage | ${pct(summary.citationCoverage)} |\n| Document classification | ${pct(summary.documentTypeAccuracy)} |\n| Average latency | ${(summary.averageLatencyMs / 1000).toFixed(1)}s |\n| Input tokens | ${summary.inputTokens.toLocaleString()} |\n| Output tokens | ${summary.outputTokens.toLocaleString()} |\n| Estimated provider cost | ${summary.estimatedCostUsd == null ? 'Not configured' : `$${summary.estimatedCostUsd.toFixed(4)}`} |\n\n## Cases\n\n| Case | Correct fields | False positives | Citation coverage | Latency |\n|---|---:|---:|---:|---:|\n${rows}\n`
}

async function main() {
  const manifestPath = path.resolve(ROOT, argValue('--manifest', 'validation/om-benchmark/ground-truth.json'))
  const dryRun = process.argv.includes('--dry-run')
  const consent = process.argv.includes('--consent-external-processing')
  const manifest = readManifest(manifestPath)
  console.log(`Validated ${manifest.cases.length} benchmark case${manifest.cases.length === 1 ? '' : 's'}.`)
  if (dryRun) return
  if (!consent) throw new Error('External processing is disabled. Re-run with --consent-external-processing only after confirming these PDFs may be sent to Anthropic.')
  const envPath = path.join(ROOT, '.env.local')
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envPath)
  const moduleUrl = pathToFileURL(path.join(ROOT, 'lib', 'underwriting-extraction.ts')).href
  const { extractUnderwritingFacts } = await import(moduleUrl)
  const results = []
  for (const item of manifest.cases) {
    process.stdout.write(`Extracting ${item.id}... `)
    const started = Date.now()
    const extraction = await extractUnderwritingFacts(fs.readFileSync(item.absoluteFile), path.basename(item.absoluteFile))
    results.push(scoreCase(item, extraction, Date.now() - started))
    console.log('done')
  }
  const report = { generatedAt: new Date().toISOString(), manifest: path.relative(ROOT, manifestPath), summary: aggregate(results, manifest.pricing), results }
  const reportDir = path.resolve(ROOT, argValue('--report-dir', 'validation/om-benchmark/reports'))
  fs.mkdirSync(reportDir, { recursive: true })
  const stamp = report.generatedAt.replace(/[:.]/g, '-')
  const jsonPath = path.join(reportDir, `${stamp}.json`)
  const markdownPath = path.join(reportDir, `${stamp}.md`)
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`)
  fs.writeFileSync(markdownPath, markdownReport(report))
  console.log(markdownReport(report))
  console.log(`Reports: ${jsonPath} and ${markdownPath}`)
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)))
