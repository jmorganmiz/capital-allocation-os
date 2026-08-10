import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

type AdminClient = SupabaseClient<Database>

const DAY_MS = 86_400_000
const PILOT_WINDOW_DAYS = 30

function daysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString()
}

function pct(numerator: number, denominator: number) {
  if (!denominator) return 0
  return Math.round((numerator / denominator) * 100)
}

function minutesBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  return ms / 60_000
}

function avg(values: number[]) {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function csvEscape(value: unknown) {
  const raw = value === null || value === undefined ? '' : String(value)
  if (!/[",\n\r]/.test(raw)) return raw
  return `"${raw.replaceAll('"', '""')}"`
}

export function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n')
}

type DealRow = {
  id: string
  firm_id: string
  title: string
  market: string | null
  deal_type: string | null
  source_name: string | null
  asking_price: number | null
  stage_id: string | null
  is_archived: boolean
  created_by: string
  created_at: string
  updated_at: string
  archived_at: string | null
  intake_type: string | null
  address: string | null
}

type StageRow = {
  id: string
  firm_id: string
  name: string
  position: number
  is_terminal: boolean
}

type FinancialRow = {
  firm_id: string
  deal_id: string
  purchase_price: number | null
  noi: number | null
  cap_rate: number | null
  irr: number | null
  created_at: string
}

type FirmRow = { id: string; name: string }
type UsageRow = { firm_id: string; user_id: string; event_type: string; quantity: number | null; metadata: unknown; created_at: string }
type InboundRow = { firm_id: string | null; status: string; received_at: string; processed_at: string | null; last_error: string | null; attachment_count: number | null; deal_ids: unknown }
type DealEventRow = { firm_id: string; deal_id: string; event_type: string; created_at: string; kill_reason_id: string | null; notes: string | null; actor_user_id: string }
type NoteRow = { firm_id: string; deal_id: string; section: string; content: string; updated_at: string }
type ScoreRow = { firm_id: string | null; deal_id: string; score: number; updated_at: string }
type FileRow = { firm_id: string; deal_id: string; filename: string; created_at: string }
type RunRow = { firm_id: string; deal_id: string; run_type: string; status: string; assumption_status: string; created_at: string; completed_at: string | null; approved_at: string | null; credits_settled: number }

export type ExportReadyDeal = {
  firmId: string
  firmName: string
  dealId: string
  property: string
  market: string
  assetType: string
  sponsorBroker: string
  purchasePrice: number | null
  noi: number | null
  capRate: number | null
  stage: string
  buyBoxScore: number | null
  decision: string
  rationale: string
  hasSupportingDocs: boolean
  hasReviewHistory: boolean
  ready: boolean
  missing: string[]
}

export type PilotFirmMetrics = {
  firmId: string
  firmName: string
  totalDeals: number
  dealsProcessed30d: number
  activeDeals: number
  killedDeals: number
  returningUsers14d: number
  avgEmailParseMinutes: number | null
  emailReceived30d: number
  emailFailed30d: number
  scoredDealsRate: number
  decisionCaptureRate: number
  exportReadyRate: number
  fieldAcceptanceProxy: number | null
  quickPencils30d: number
  fullUnderwrites30d: number
}

export type PilotAnalytics = {
  generatedAt: string
  windowDays: number
  headline: {
    firms: number
    dealsProcessed: number
    avgEmailParseMinutes: number | null
    decisionCaptureRate: number
    exportReadyRate: number
    fieldAcceptanceProxy: number | null
  }
  firms: PilotFirmMetrics[]
  exportReadyDeals: ExportReadyDeal[]
}

export async function getPilotAnalytics(admin: AdminClient): Promise<PilotAnalytics> {
  const since = daysAgo(PILOT_WINDOW_DAYS)
  const since14 = daysAgo(14)

  const [
    { data: firms },
    { data: stages },
    { data: deals },
    { data: usageEvents },
    { data: inboundEvents },
    { data: dealEvents },
    { data: notes },
    { data: scores },
    { data: snapshots },
    { data: files },
    { data: runs },
  ] = await Promise.all([
    admin.from('firms').select('id, name').order('created_at', { ascending: false }),
    admin.from('deal_stages').select('id, firm_id, name, position, is_terminal').limit(10000),
    admin.from('deals').select('id, firm_id, title, market, deal_type, source_name, asking_price, stage_id, is_archived, created_by, created_at, updated_at, archived_at, intake_type, address').limit(10000),
    admin.from('usage_events').select('firm_id, user_id, event_type, quantity, metadata, created_at').gte('created_at', since).limit(10000),
    admin.from('inbound_email_events').select('firm_id, status, received_at, processed_at, last_error, attachment_count, deal_ids').gte('received_at', since).limit(10000),
    admin.from('deal_events').select('firm_id, deal_id, event_type, created_at, kill_reason_id, notes, actor_user_id, kill_reasons(name)').limit(10000),
    admin.from('deal_notes').select('firm_id, deal_id, section, content, updated_at').limit(10000),
    admin.from('deal_scores').select('firm_id, deal_id, score, updated_at').limit(10000),
    admin.from('deal_financial_snapshots').select('firm_id, deal_id, purchase_price, noi, cap_rate, irr, created_at').limit(10000),
    admin.from('deal_files').select('firm_id, deal_id, filename, created_at').limit(10000),
    admin.from('underwriting_runs').select('firm_id, deal_id, run_type, status, assumption_status, created_at, completed_at, approved_at, credits_settled').gte('created_at', since).limit(10000),
  ])

  const firmRows = (firms ?? []) as FirmRow[]
  const dealRows = (deals ?? []) as DealRow[]
  const stageRows = (stages ?? []) as StageRow[]
  const usageRows = (usageEvents ?? []) as UsageRow[]
  const inboundRows = (inboundEvents ?? []) as InboundRow[]
  const eventRows = (dealEvents ?? []) as DealEventRow[]
  const noteRows = (notes ?? []) as NoteRow[]
  const scoreRows = (scores ?? []) as ScoreRow[]
  const snapshotRows = (snapshots ?? []) as FinancialRow[]
  const fileRows = (files ?? []) as FileRow[]
  const runRows = (runs ?? []) as RunRow[]

  const stageById = new Map(stageRows.map((stage) => [stage.id, stage]))
  const scoresByDeal = new Map<string, ScoreRow[]>()
  for (const score of scoreRows) {
    const list = scoresByDeal.get(score.deal_id) ?? []
    list.push(score)
    scoresByDeal.set(score.deal_id, list)
  }

  const eventsByDeal = new Map<string, DealEventRow[]>()
  for (const event of eventRows) {
    const list = eventsByDeal.get(event.deal_id) ?? []
    list.push(event)
    eventsByDeal.set(event.deal_id, list)
  }

  const notesByDeal = new Map<string, NoteRow[]>()
  for (const note of noteRows) {
    const list = notesByDeal.get(note.deal_id) ?? []
    list.push(note)
    notesByDeal.set(note.deal_id, list)
  }

  const filesByDeal = new Map<string, FileRow[]>()
  for (const file of fileRows) {
    const list = filesByDeal.get(file.deal_id) ?? []
    list.push(file)
    filesByDeal.set(file.deal_id, list)
  }

  const latestSnapshotByDeal = new Map<string, FinancialRow>()
  for (const snapshot of snapshotRows) {
    const existing = latestSnapshotByDeal.get(snapshot.deal_id)
    if (!existing || new Date(snapshot.created_at) > new Date(existing.created_at)) {
      latestSnapshotByDeal.set(snapshot.deal_id, snapshot)
    }
  }

  const exportReadyDeals: ExportReadyDeal[] = dealRows.map((deal) => {
    const firmName = firmRows.find((firm) => firm.id === deal.firm_id)?.name ?? 'Unknown firm'
    const stage = deal.stage_id ? stageById.get(deal.stage_id) : null
    const latestSnapshot = latestSnapshotByDeal.get(deal.id)
    const dealScores = scoresByDeal.get(deal.id) ?? []
    const dealNotes = notesByDeal.get(deal.id) ?? []
    const dealFiles = filesByDeal.get(deal.id) ?? []
    const events = eventsByDeal.get(deal.id) ?? []
    const killEvent = events.find((event) => event.event_type === 'killed')
    const rationale = killEvent?.notes || dealNotes.find((note) => ['overview', 'risks', 'notes'].includes(note.section) && note.content.trim())?.content || ''
    const avgScore = dealScores.length ? Math.round(dealScores.reduce((sum, score) => sum + Number(score.score ?? 0), 0) / dealScores.length * 20) : null
    const decision = deal.is_archived
      ? 'Killed'
      : stage?.is_terminal
        ? stage.name
        : stage && stage.position > 0
          ? 'Advanced'
          : 'In review'
    const missing = [
      !deal.title ? 'property name' : null,
      !(deal.market || deal.address) ? 'market/address' : null,
      !deal.deal_type ? 'asset type' : null,
      !(deal.source_name) ? 'sponsor/broker' : null,
      !(deal.asking_price || latestSnapshot?.purchase_price) ? 'purchase price' : null,
      !(latestSnapshot?.noi) ? 'NOI' : null,
      !(latestSnapshot?.cap_rate) ? 'cap rate' : null,
      !stage ? 'stage' : null,
      avgScore === null ? 'buy-box score' : null,
      !rationale ? 'decision rationale' : null,
      dealFiles.length === 0 ? 'supporting docs' : null,
      events.length === 0 ? 'review history' : null,
    ].filter(Boolean) as string[]

    return {
      firmId: deal.firm_id,
      firmName,
      dealId: deal.id,
      property: deal.title,
      market: deal.market || deal.address || '',
      assetType: deal.deal_type || '',
      sponsorBroker: deal.source_name || '',
      purchasePrice: deal.asking_price ?? latestSnapshot?.purchase_price ?? null,
      noi: latestSnapshot?.noi ?? null,
      capRate: latestSnapshot?.cap_rate ?? null,
      stage: stage?.name ?? '',
      buyBoxScore: avgScore,
      decision,
      rationale,
      hasSupportingDocs: dealFiles.length > 0,
      hasReviewHistory: events.length > 0,
      ready: missing.length === 0,
      missing,
    }
  })

  const metrics = firmRows.map((firm) => {
    const firmDeals = dealRows.filter((deal) => deal.firm_id === firm.id)
    const firmUsage = usageRows.filter((event) => event.firm_id === firm.id)
    const dealCreatedEvents = firmUsage.filter((event) => event.event_type === 'deal_created')
    const firmEmails = inboundRows.filter((event) => event.firm_id === firm.id)
    const firmRuns = runRows.filter((run) => run.firm_id === firm.id)
    const firmExportDeals = exportReadyDeals.filter((deal) => deal.firmId === firm.id)
    const firmScores = new Set(scoreRows.filter((score) => score.firm_id === firm.id).map((score) => score.deal_id))
    const firmKilled = firmDeals.filter((deal) => deal.is_archived)
    const decisionReady = firmKilled.filter((deal) => {
      const events = eventsByDeal.get(deal.id) ?? []
      const killEvent = events.find((event) => event.event_type === 'killed')
      return Boolean(killEvent?.kill_reason_id || killEvent?.notes)
    })
    const editedParsedDeals = new Set(eventRows
      .filter((event) => event.firm_id === firm.id && event.event_type === 'deal_fields_updated')
      .map((event) => event.deal_id))
    const parsedDeals = new Set(dealCreatedEvents
      .filter((event) => {
        const metadata = event.metadata as { source?: string } | null
        return metadata?.source === 'upload' || metadata?.source === 'email'
      })
      .map((event) => {
        const metadata = event.metadata as { deal_id?: string } | null
        return metadata?.deal_id
      })
      .filter(Boolean) as string[])
    const parseMinutes = firmEmails
      .map((email) => minutesBetween(email.received_at, email.processed_at))
      .filter((value): value is number => value !== null)
    const returningUsers = new Set(firmUsage.filter((event) => event.created_at >= since14).map((event) => event.user_id))

    return {
      firmId: firm.id,
      firmName: firm.name,
      totalDeals: firmDeals.length,
      dealsProcessed30d: Math.round(dealCreatedEvents.reduce((sum, event) => sum + Number(event.quantity ?? 1), 0)),
      activeDeals: firmDeals.filter((deal) => !deal.is_archived).length,
      killedDeals: firmKilled.length,
      returningUsers14d: returningUsers.size,
      avgEmailParseMinutes: avg(parseMinutes),
      emailReceived30d: firmEmails.length,
      emailFailed30d: firmEmails.filter((event) => event.status === 'failed').length,
      scoredDealsRate: pct(firmScores.size, firmDeals.length),
      decisionCaptureRate: pct(decisionReady.length, firmKilled.length),
      exportReadyRate: pct(firmExportDeals.filter((deal) => deal.ready).length, firmExportDeals.length),
      fieldAcceptanceProxy: parsedDeals.size ? pct(parsedDeals.size - editedParsedDeals.size, parsedDeals.size) : null,
      quickPencils30d: firmRuns.filter((run) => run.run_type === 'quick_pencil').length,
      fullUnderwrites30d: firmRuns.filter((run) => run.run_type === 'full_underwrite').length,
    } satisfies PilotFirmMetrics
  })

  const activePilotFirms = metrics.filter((firm) => firm.dealsProcessed30d > 0)
  const allEmailMinutes = metrics.map((firm) => firm.avgEmailParseMinutes).filter((value): value is number => value !== null)
  const weightedKilled = metrics.reduce((sum, firm) => sum + firm.killedDeals, 0)
  const weightedDecision = metrics.reduce((sum, firm) => sum + Math.round((firm.decisionCaptureRate / 100) * firm.killedDeals), 0)
  const exportDeals = exportReadyDeals.filter((deal) => deal.decision !== 'In review')
  const fieldProxyValues = metrics.map((firm) => firm.fieldAcceptanceProxy).filter((value): value is number => value !== null)

  return {
    generatedAt: new Date().toISOString(),
    windowDays: PILOT_WINDOW_DAYS,
    headline: {
      firms: activePilotFirms.length,
      dealsProcessed: metrics.reduce((sum, firm) => sum + firm.dealsProcessed30d, 0),
      avgEmailParseMinutes: avg(allEmailMinutes),
      decisionCaptureRate: pct(weightedDecision, weightedKilled),
      exportReadyRate: pct(exportDeals.filter((deal) => deal.ready).length, exportDeals.length),
      fieldAcceptanceProxy: avg(fieldProxyValues),
    },
    firms: metrics.sort((a, b) => b.dealsProcessed30d - a.dealsProcessed30d),
    exportReadyDeals,
  }
}

export function pilotFirmRows(analytics: PilotAnalytics) {
  return analytics.firms.map((firm) => ({
    firm: firm.firmName,
    deals_processed_30d: firm.dealsProcessed30d,
    total_deals: firm.totalDeals,
    active_deals: firm.activeDeals,
    killed_deals: firm.killedDeals,
    returning_users_14d: firm.returningUsers14d,
    avg_email_parse_minutes: firm.avgEmailParseMinutes?.toFixed(1) ?? '',
    email_received_30d: firm.emailReceived30d,
    email_failed_30d: firm.emailFailed30d,
    scored_deals_rate_pct: firm.scoredDealsRate,
    decision_capture_rate_pct: firm.decisionCaptureRate,
    export_ready_rate_pct: firm.exportReadyRate,
    field_acceptance_proxy_pct: firm.fieldAcceptanceProxy ?? '',
    quick_pencils_30d: firm.quickPencils30d,
    full_underwrites_30d: firm.fullUnderwrites30d,
  }))
}

export function exportReadyRows(analytics: PilotAnalytics) {
  return analytics.exportReadyDeals.map((deal) => ({
    firm: deal.firmName,
    property: deal.property,
    market: deal.market,
    asset_type: deal.assetType,
    sponsor_broker: deal.sponsorBroker,
    purchase_price: deal.purchasePrice ?? '',
    noi: deal.noi ?? '',
    cap_rate: deal.capRate ?? '',
    stage: deal.stage,
    buy_box_score: deal.buyBoxScore ?? '',
    decision: deal.decision,
    decision_rationale: deal.rationale,
    supporting_docs: deal.hasSupportingDocs ? 'yes' : 'no',
    review_history: deal.hasReviewHistory ? 'yes' : 'no',
    export_ready: deal.ready ? 'yes' : 'no',
    missing_fields: deal.missing.join('; '),
    deal_id: deal.dealId,
  }))
}
