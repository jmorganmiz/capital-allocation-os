// Builds the compact firm-workspace context block the AI Analyst answers over.
// Pure module (no imports) so it stays unit-testable under node:test.

const LIMITS = { deals: 150, memories: 40, actuals: 40, candidates: 20 }
const MAX_CONTEXT_CHARS = 24_000

function money(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 'price n/a'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  return `$${Math.round(n).toLocaleString()}`
}

function scoreFor(deal) {
  const scores = (deal.deal_scores ?? []).map((item) => Number(item.score)).filter((s) => Number.isFinite(s) && s > 0)
  if (scores.length === 0) return null
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length
  return Math.round(((avg - 1) / 4) * 100)
}

function clean(text, max = 220) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

function dealLine(deal) {
  const score = scoreFor(deal)
  const killEvent = (deal.deal_events ?? []).find((event) => event.kill_reasons?.name)
  const note = (deal.deal_events ?? []).find((event) => event.notes)?.notes
  const parts = [
    clean(deal.title, 80),
    deal.market ? clean(deal.market, 40) : null,
    deal.deal_type ? clean(deal.deal_type, 30) : null,
    deal.is_archived ? `KILLED${killEvent ? ` (${clean(killEvent.kill_reasons.name, 40)})` : ''}` : `stage: ${deal.deal_stages?.name ?? 'none'}`,
    money(deal.asking_price),
    score !== null ? `score ${score}/100` : null,
    deal.source_name ? `source: ${clean(deal.source_name, 40)}` : null,
    `updated ${String(deal.updated_at ?? '').slice(0, 10)}`,
    note ? `note: ${clean(note, 120)}` : null,
  ]
  return `- ${parts.filter(Boolean).join(' | ')}`
}

export function buildFirmContext({ deals = [], memories = [], actuals = [], candidates = [] }) {
  const sections = []

  const active = deals.filter((deal) => !deal.is_archived)
  const killed = deals.filter((deal) => deal.is_archived)
  sections.push(
    `PIPELINE SUMMARY: ${deals.length} deals in memory (${active.length} active, ${killed.length} killed).`,
    '',
    'DEALS (most recently updated first):',
    ...deals.slice(0, LIMITS.deals).map(dealLine),
  )

  if (memories.length > 0) {
    sections.push('', 'FIRM MEMORY NOTES (saved answers, corrections, firm rules):')
    for (const memory of memories.slice(0, LIMITS.memories)) {
      sections.push(`- [${memory.feedback_type}] ${clean(memory.content, 300)}`)
    }
  }

  if (actuals.length > 0) {
    sections.push('', 'PORTFOLIO ACTUALS (realized operating periods, latest first):')
    for (const actual of actuals.slice(0, LIMITS.actuals)) {
      const parts = [
        clean(actual.deals?.title ?? 'Unknown property', 60),
        String(actual.period_date ?? '').slice(0, 10),
        actual.noi == null ? null : `NOI ${money(actual.noi)}`,
        actual.occupancy == null ? null : `occupancy ${(Number(actual.occupancy) * 100).toFixed(1)}%`,
        actual.average_monthly_rent == null ? null : `avg rent ${money(actual.average_monthly_rent)}/mo`,
      ]
      sections.push(`- ${parts.filter(Boolean).join(' | ')}`)
    }
  }

  const activeCandidates = candidates.filter((item) => !['dismissed', 'promoted'].includes(item.status))
  if (activeCandidates.length > 0) {
    sections.push('', 'PROPERTY FINDER INBOX (sourced opportunities awaiting review):')
    for (const item of activeCandidates.slice(0, LIMITS.candidates)) {
      const parts = [
        clean(item.property_name, 60),
        item.market ? clean(item.market, 40) : null,
        item.asset_type ? clean(item.asset_type, 30) : null,
        money(item.asking_price),
        item.match_score == null ? 'not scored' : `match ${item.match_score}`,
      ]
      sections.push(`- ${parts.filter(Boolean).join(' | ')}`)
    }
  }

  return sections.join('\n').slice(0, MAX_CONTEXT_CHARS)
}
