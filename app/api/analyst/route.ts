import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rankRelevantMemories } from '@/lib/firm-memory.mjs'

type DealRow = {
  id: string
  title: string
  market: string | null
  deal_type: string | null
  source_name: string | null
  asking_price: number | null
  is_archived: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
  deal_stages: { name: string } | null
  deal_scores: { score: number }[]
  deal_events: { notes: string | null; kill_reasons: { name: string } | null }[]
}

type FirmMemory = {
  id: string
  content: string
  feedback_type: string
  tags: string[]
  created_at: string
}

type ActualRow = {
  period_date: string
  noi: number | null
  occupancy: number | null
  average_monthly_rent: number | null
  source_reference: string | null
  deals: { id: string; title: string; market: string | null } | null
}

type SourcingRow = {
  property_name: string
  market: string | null
  asset_type: string | null
  asking_price: number | null
  unit_count: number | null
  status: string
  match_score: number | null
  match_reasons: unknown
  possible_duplicate_deal_id: string | null
}

function normalize(input: string) {
  return input.toLowerCase().trim()
}

function money(value: number | null) {
  if (value == null) return 'price not captured'
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
  return `$${value.toLocaleString()}`
}

function scoreFor(deal: DealRow) {
  const scores = (deal.deal_scores ?? []).map((item) => Number(item.score)).filter(Boolean)
  if (scores.length === 0) return null
  const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length
  return Math.round(((avg - 1) / 4) * 100)
}

function marketFromQuestion(question: string, deals: DealRow[]) {
  const lower = normalize(question)
  const markets = [...new Set(deals.map((deal) => deal.market).filter(Boolean) as string[])]
  return markets.find((market) => lower.includes(market.toLowerCase().split(',')[0].trim())) ?? null
}

function typeFromQuestion(question: string, deals: DealRow[]) {
  const lower = normalize(question)
  const types = [...new Set(deals.map((deal) => deal.deal_type).filter(Boolean) as string[])]
  return types.find((type) => lower.includes(type.toLowerCase())) ?? null
}

function topKillReasons(deals: DealRow[]) {
  const counts = new Map<string, number>()
  for (const deal of deals) {
    const reason = deal.deal_events?.find((event) => event.kill_reasons?.name)?.kill_reasons?.name
    if (reason) counts.set(reason, (counts.get(reason) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

function answerStale(deals: DealRow[]) {
  const active = deals.filter((deal) => !deal.is_archived)
  const stale = active
    .map((deal) => ({ deal, age: Date.now() - new Date(deal.updated_at).getTime() }))
    .filter((item) => item.age > 7 * 24 * 60 * 60 * 1000)
    .sort((a, b) => b.age - a.age)
    .slice(0, 5)

  if (stale.length === 0) {
    return 'No stale active deals jumped out. Your active pipeline has been touched within the last week.'
  }

  return [
    `${stale.length} active deals look stale based on last update time:`,
    ...stale.map(({ deal }) => `- ${deal.title} - ${deal.deal_stages?.name ?? 'No stage'}, updated ${new Date(deal.updated_at).toLocaleDateString()}.`),
    'I would start with the oldest item and either move it forward, kill it, or add a decision note.',
  ].join('\n')
}

function answerKilled(question: string, deals: DealRow[]) {
  const killed = deals.filter((deal) => deal.is_archived)
  const market = marketFromQuestion(question, deals)
  const type = typeFromQuestion(question, deals)
  const scoped = killed.filter((deal) => (!market || deal.market === market) && (!type || deal.deal_type === type))
  const target = scoped.length > 0 ? scoped : killed
  const reasons = topKillReasons(target).slice(0, 4)

  if (target.length === 0) {
    return 'I do not see killed deals in this firm memory yet. Once deals move to Graveyard, I can explain patterns by market, asset type, broker, or kill reason.'
  }

  const scope = [market, type].filter(Boolean).join(' / ') || 'the graveyard'
  return [
    `In ${scope}, I found ${target.length} killed ${target.length === 1 ? 'deal' : 'deals'}.`,
    reasons.length > 0
      ? `Top kill reasons: ${reasons.map(([reason, count]) => `${reason} (${count})`).join(', ')}.`
      : 'Most killed deals do not have structured kill reasons captured yet.',
    ...target.slice(0, 4).map((deal) => {
      const note = deal.deal_events?.find((event) => event.notes)?.notes
      return `- ${deal.title} - ${deal.market ?? 'market unknown'}, ${money(deal.asking_price)}${note ? `; note: ${note}` : ''}`
    }),
  ].join('\n')
}

function answerBroker(question: string, deals: DealRow[]) {
  const lower = normalize(question)
  const brokers = [...new Set(deals.map((deal) => deal.source_name).filter(Boolean) as string[])]
  const broker = brokers.find((name) => lower.includes(name.toLowerCase())) ?? null
  const scoped = broker ? deals.filter((deal) => deal.source_name === broker) : deals.filter((deal) => deal.source_name)

  if (scoped.length === 0) {
    return 'I do not see broker/source history captured on the current firm deals yet.'
  }

  const grouped = new Map<string, DealRow[]>()
  for (const deal of scoped) {
    if (!deal.source_name) continue
    grouped.set(deal.source_name, [...(grouped.get(deal.source_name) ?? []), deal])
  }

  const ranked = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, broker ? 1 : 5)
  return [
    broker ? `Yes - I found ${scoped.length} deals from ${broker}.` : 'Here are the most common captured sources:',
    ...ranked.map(([name, items]) => {
      const killed = items.filter((deal) => deal.is_archived).length
      const avgScores = items.map(scoreFor).filter((score): score is number => score !== null)
      const avgScore = avgScores.length ? Math.round(avgScores.reduce((sum, score) => sum + score, 0) / avgScores.length) : null
      return `- ${name}: ${items.length} deals, ${killed} killed${avgScore !== null ? `, avg score ${avgScore}` : ''}.`
    }),
  ].join('\n')
}

function answerSummary(deals: DealRow[]) {
  const active = deals.filter((deal) => !deal.is_archived)
  const killed = deals.filter((deal) => deal.is_archived)
  const byStage = new Map<string, number>()
  for (const deal of active) {
    const stage = deal.deal_stages?.name ?? 'No stage'
    byStage.set(stage, (byStage.get(stage) ?? 0) + 1)
  }
  const reasons = topKillReasons(killed).slice(0, 3)

  return [
    `Your firm memory has ${deals.length} total deals: ${active.length} active and ${killed.length} killed.`,
    byStage.size > 0 ? `Active pipeline: ${[...byStage.entries()].map(([stage, count]) => `${stage} ${count}`).join(', ')}.` : 'No active pipeline stages are populated yet.',
    reasons.length > 0 ? `Most common kill reasons: ${reasons.map(([reason, count]) => `${reason} (${count})`).join(', ')}.` : 'No dominant kill reason is visible yet.',
  ].join('\n')
}

function answerCompare(question: string, deals: DealRow[]) {
  const lower = normalize(question)
  const titleMatch = deals.find((deal) => lower.includes(deal.title.toLowerCase().slice(0, Math.min(12, deal.title.length))))
  const current = titleMatch ?? deals.find((deal) => !deal.is_archived) ?? deals[0]
  if (!current) return 'I need at least one deal in memory before I can compare anything.'

  const similar = deals
    .filter((deal) => deal.id !== current.id)
    .filter((deal) => (current.market && deal.market === current.market) || (current.deal_type && deal.deal_type === current.deal_type))
    .slice(0, 5)

  if (similar.length === 0) {
    return `${current.title} is in memory, but I do not see enough similar market or asset-type deals yet for a useful comparison.`
  }

  const currentScore = scoreFor(current)
  const killed = similar.filter((deal) => deal.is_archived)
  const similarScores = similar.map(scoreFor).filter((score): score is number => score !== null)
  const avgSimilar = similarScores.length ? Math.round(similarScores.reduce((sum, score) => sum + score, 0) / similarScores.length) : null

  return [
    `${current.title} compares against ${similar.length} similar deals by market or asset type.`,
    currentScore !== null ? `Current score: ${currentScore}/100${avgSimilar !== null ? ` vs similar average ${avgSimilar}/100` : ''}.` : 'This deal does not have enough scoring data yet.',
    killed.length > 0 ? `${killed.length} of the similar deals were killed. Top reasons: ${topKillReasons(killed).slice(0, 2).map(([reason, count]) => `${reason} (${count})`).join(', ') || 'not captured'}.` : 'None of the matched similar deals are currently in Graveyard.',
    ...similar.slice(0, 3).map((deal) => `- ${deal.title} - ${deal.market ?? 'market unknown'}, ${deal.is_archived ? 'killed' : deal.deal_stages?.name ?? 'active'}, score ${scoreFor(deal) ?? 'n/a'}.`),
  ].join('\n')
}

function answerActuals(question: string, actuals: ActualRow[]) {
  if (actuals.length === 0) return 'No realized operating periods are recorded yet. Add actual NOI, occupancy, and rent on a deal to begin calibrating underwriting against performance.'
  const lower = normalize(question)
  const title = [...new Set(actuals.map((item) => item.deals?.title).filter(Boolean) as string[])].find((item) => lower.includes(item.toLowerCase().slice(0, Math.min(12, item.length))))
  const scoped = title ? actuals.filter((item) => item.deals?.title === title) : actuals
  const latestByDeal = new Map<string, ActualRow>()
  for (const actual of scoped) {
    const id = actual.deals?.id
    if (!id || latestByDeal.has(id)) continue
    latestByDeal.set(id, actual)
  }
  const rows = [...latestByDeal.values()].slice(0, 6)
  return [
    title ? `Latest recorded performance for ${title}:` : `I found actual operating data for ${latestByDeal.size} properties. Latest reported periods:`,
    ...rows.map((item) => `- ${item.deals?.title ?? 'Unknown property'} (${new Date(`${item.period_date}T00:00:00Z`).toLocaleDateString()}): ${item.noi == null ? 'NOI not captured' : `${money(Number(item.noi))} annualized NOI`}, ${item.occupancy == null ? 'occupancy not captured' : `${(Number(item.occupancy) * 100).toFixed(1)}% occupancy`}${item.average_monthly_rent == null ? '' : `, ${money(Number(item.average_monthly_rent))} average monthly rent`}.`),
    'Open the deal’s Actuals section to compare each observation with its preserved underwriting baseline.',
  ].join('\n')
}

function answerSourcing(candidates: SourcingRow[]) {
  const active = candidates.filter((item) => !['dismissed', 'promoted'].includes(item.status))
  if (active.length === 0) return 'The Property Finder inbox is empty. Add a permitted listing URL or import an opportunity file to begin matching properties against the firm buy box.'
  const ranked = [...active].sort((a, b) => Number(b.match_score ?? -1) - Number(a.match_score ?? -1)).slice(0, 6)
  return [
    `${active.length} active sourced opportunities are waiting. Highest buy-box matches:`,
    ...ranked.map((item) => `- ${item.property_name} - ${item.market ?? 'market unknown'}, ${item.asset_type ?? 'asset type unknown'}, ${money(item.asking_price)}, match ${item.match_score ?? 'not scored'}${item.possible_duplicate_deal_id ? '; possible duplicate' : ''}.`),
    'Promote a clean candidate to create the pipeline deal, preserve the source, and run firm scoring.',
  ].join('\n')
}

function buildAnswer(question: string, deals: DealRow[], memories: FirmMemory[], actuals: ActualRow[], candidates: SourcingRow[]) {
  const lower = normalize(question)
  const memoryMatches = rankRelevantMemories(question, memories)
  let answer: string

  if (lower.includes('property finder') || lower.includes('sourced opportun') || lower.includes('what should we pursue') || lower.includes('find propert')) answer = answerSourcing(candidates)
  else if (lower.includes('actual') || lower.includes('perform') || lower.includes('occupancy') || lower.includes('operat')) answer = answerActuals(question, actuals)
  else if (lower.includes('stale') || lower.includes('attention') || lower.includes('review')) answer = answerStale(deals)
  else if (lower.includes('broker') || lower.includes('source')) answer = answerBroker(question, deals)
  else if (lower.includes('kill') || lower.includes('graveyard') || lower.includes('fail') || lower.includes('price')) answer = answerKilled(question, deals)
  else if (lower.includes('compare') || lower.includes('similar') || lower.includes('seen this') || lower.includes('seen before')) answer = answerCompare(question, deals)
  else if (lower.includes('summarize') || lower.includes('summary') || lower.includes('pipeline') || lower.includes('memory')) answer = answerSummary(deals)
  else {
    answer = [
      answerSummary(deals),
      '',
      'Try asking about killed deals, stale pipeline items, broker history, or similar deals for a specific market/type.',
    ].join('\n')
  }

  return {
    answer,
    memoryCandidate: `When asked "${question}", Dealstash answered: ${answer.slice(0, 1200)}`,
    memoryReferences: memoryMatches.map((memory: FirmMemory) => ({
      id: memory.id,
      content: memory.content,
      feedbackType: memory.feedback_type,
    })),
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) return NextResponse.json({ error: 'Firm not found' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const question = typeof body.question === 'string' ? body.question.slice(0, 500) : ''
  if (!question.trim()) return NextResponse.json({ error: 'Question is required' }, { status: 400 })

  const [{ data: deals, error }, { data: memories }, { data: actuals }, { data: candidates }] = await Promise.all([
    supabase
      .from('deals')
      .select(`
        id, title, market, deal_type, source_name, asking_price, is_archived, archived_at, created_at, updated_at,
        deal_stages(name),
        deal_scores(score),
        deal_events(notes, kill_reasons(name))
      `)
      .eq('firm_id', profile.firm_id)
      .order('updated_at', { ascending: false })
      .limit(250),
    supabase
      .from('firm_memories')
      .select('id, content, feedback_type, tags, created_at')
      .eq('firm_id', profile.firm_id)
      .in('feedback_type', ['saved', 'correction', 'firm_rule'])
      .order('created_at', { ascending: false })
      .limit(50)
      .then((result) => result.error ? { data: [] } : result),
    supabase
      .from('portfolio_actuals')
      .select('period_date, noi, occupancy, average_monthly_rent, source_reference, deals(id, title, market)')
      .eq('firm_id', profile.firm_id)
      .order('period_date', { ascending: false })
      .limit(250)
      .then((result) => result.error ? { data: [] } : result),
    supabase
      .from('sourcing_opportunities')
      .select('property_name, market, asset_type, asking_price, unit_count, status, match_score, match_reasons, possible_duplicate_deal_id')
      .eq('firm_id', profile.firm_id)
      .order('created_at', { ascending: false })
      .limit(250)
      .then((result) => result.error ? { data: [] } : result),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = buildAnswer(question, (deals ?? []) as unknown as DealRow[], (memories ?? []) as FirmMemory[], (actuals ?? []) as unknown as ActualRow[], (candidates ?? []) as SourcingRow[])
  return NextResponse.json({
    ...result,
    sources: {
      deals: deals?.length ?? 0,
      memories: memories?.length ?? 0,
      actuals: actuals?.length ?? 0,
      sourcingOpportunities: candidates?.length ?? 0,
      generatedFrom: 'firm_memory',
    },
  })
}
