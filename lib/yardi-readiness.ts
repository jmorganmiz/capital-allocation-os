export type YardiReadinessItem = {
  key: string
  label: string
  complete: boolean
  value?: string | null
  help: string
}

export type YardiReadiness = {
  score: number
  completeCount: number
  totalCount: number
  ready: boolean
  items: YardiReadinessItem[]
  missing: string[]
  decision: string
  rationale: string
}

type StageLike = { name: string | null; position?: number | null; is_terminal?: boolean | null } | null

type BuildInput = {
  title?: string | null
  market?: string | null
  address?: string | null
  dealType?: string | null
  sourceName?: string | null
  askingPrice?: number | null
  stage?: StageLike
  isArchived?: boolean | null
  purchasePrice?: number | null
  noi?: number | null
  capRate?: number | null
  buyBoxScore?: number | null
  notes?: Array<{ section?: string | null; content?: string | null }>
  files?: Array<unknown>
  events?: Array<{ event_type?: string | null; notes?: string | null; kill_reason_id?: string | null; kill_reasons?: { name?: string | null } | Array<{ name?: string | null }> | null }>
}

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0)
}

function money(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return null
  return `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function pct(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return null
  const n = Number(value)
  return `${Math.abs(n) <= 1 ? (n * 100).toFixed(2) : n.toFixed(2)}%`
}

export function buildYardiReadiness(input: BuildInput): YardiReadiness {
  const events = input.events ?? []
  const notes = input.notes ?? []
  const files = input.files ?? []
  const killEvent = events.find((event) => event.event_type === 'killed')
  const noteRationale = notes.find((note) => ['overview', 'risks', 'notes'].includes(note.section ?? '') && hasText(note.content))?.content?.trim() ?? ''
  const rationale = killEvent?.notes?.trim() || noteRationale
  const stageName = input.stage?.name ?? ''
  const decision = input.isArchived
    ? 'Killed'
    : input.stage?.is_terminal
      ? stageName
      : input.stage && Number(input.stage.position ?? 0) > 0
        ? 'Advanced'
        : 'In review'

  const purchasePrice = input.askingPrice ?? input.purchasePrice ?? null
  const items: YardiReadinessItem[] = [
    {
      key: 'property',
      label: 'Property / market',
      complete: hasText(input.title) && (hasText(input.market) || hasText(input.address)),
      value: [input.title, input.market || input.address].filter(Boolean).join(' / '),
      help: 'Needs a property name plus market or address.',
    },
    {
      key: 'asset_type',
      label: 'Asset type',
      complete: hasText(input.dealType),
      value: input.dealType,
      help: 'Set the asset type so exports and comps classify correctly.',
    },
    {
      key: 'sponsor_broker',
      label: 'Sponsor / broker',
      complete: hasText(input.sourceName),
      value: input.sourceName,
      help: 'Capture who brought or sponsors the opportunity.',
    },
    {
      key: 'financials',
      label: 'Price, NOI, cap',
      complete: Boolean(purchasePrice && input.noi && input.capRate),
      value: [money(purchasePrice), input.noi ? `NOI ${money(input.noi)}` : null, pct(input.capRate)].filter(Boolean).join(' / '),
      help: 'Needs purchase price, NOI, and cap rate.',
    },
    {
      key: 'stage',
      label: 'Stage',
      complete: hasText(stageName),
      value: stageName,
      help: 'Assign the deal to a workflow stage.',
    },
    {
      key: 'buy_box_score',
      label: 'Buy-box score',
      complete: input.buyBoxScore !== null && input.buyBoxScore !== undefined,
      value: input.buyBoxScore !== null && input.buyBoxScore !== undefined ? `${input.buyBoxScore}/100` : null,
      help: 'Score the deal against firm criteria.',
    },
    {
      key: 'decision_rationale',
      label: 'Decision rationale',
      complete: hasText(rationale),
      value: rationale ? rationale.slice(0, 90) : null,
      help: 'Add overview, risk notes, or kill rationale.',
    },
    {
      key: 'supporting_docs',
      label: 'Supporting docs',
      complete: files.length > 0,
      value: files.length ? `${files.length} file${files.length === 1 ? '' : 's'}` : null,
      help: 'Attach the OM or source documents.',
    },
    {
      key: 'review_history',
      label: 'Review history',
      complete: events.length > 0,
      value: events.length ? `${events.length} event${events.length === 1 ? '' : 's'}` : null,
      help: 'Needs at least one auditable deal event.',
    },
  ]

  const completeCount = items.filter((item) => item.complete).length
  const totalCount = items.length
  const score = Math.round((completeCount / totalCount) * 100)

  return {
    score,
    completeCount,
    totalCount,
    ready: completeCount === totalCount,
    items,
    missing: items.filter((item) => !item.complete).map((item) => item.label),
    decision,
    rationale,
  }
}

export function yardiDealCsvRow(input: BuildInput & { dealId: string; firmName?: string | null }) {
  const readiness = buildYardiReadiness(input)
  return {
    deal_id: input.dealId,
    firm: input.firmName ?? '',
    property: input.title ?? '',
    market: input.market || input.address || '',
    asset_type: input.dealType ?? '',
    sponsor_broker: input.sourceName ?? '',
    purchase_price: input.askingPrice ?? input.purchasePrice ?? '',
    noi: input.noi ?? '',
    cap_rate: input.capRate ?? '',
    stage: input.stage?.name ?? '',
    buy_box_score: input.buyBoxScore ?? '',
    decision: readiness.decision,
    decision_rationale: readiness.rationale,
    yardi_ready: readiness.ready ? 'yes' : 'no',
    missing_fields: readiness.missing.join('; '),
  }
}

export function rowsToCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (value: unknown) => {
    const raw = value === null || value === undefined ? '' : String(value)
    return /[",\n\r]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw
  }
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n')
}
