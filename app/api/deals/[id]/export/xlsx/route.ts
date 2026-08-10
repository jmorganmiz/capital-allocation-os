import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'
import { buildYardiReadiness } from '@/lib/yardi-readiness'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface Props {
  params: Promise<{ id: string }>
}

const colors = {
  deep: '0B0B12',
  panel: '1E1E2A',
  card: '272735',
  blue: '5266EB',
  green: '2CD284',
  amber: 'FFC107',
  red: 'FF5C67',
  text: 'F7F7FB',
  muted: '8B8B9A',
  border: '3B3B48',
}

function safe(value: unknown) {
  return value === null || value === undefined ? '' : value
}

function asNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function moneyCell(value: unknown) {
  const parsed = asNumber(value)
  return parsed === null ? '' : parsed
}

function percentCell(value: unknown) {
  const parsed = asNumber(value)
  if (parsed === null) return ''
  return Math.abs(parsed) > 1 ? parsed / 100 : parsed
}

function noteBySection(notes: any[] | null | undefined, section: string) {
  return notes?.find((note) => note.section === section)?.content?.trim() ?? ''
}

function relationName(value: any) {
  if (Array.isArray(value)) return value[0]?.name ?? ''
  return value?.name ?? ''
}

function decorateSheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  sheet.properties.defaultRowHeight = 22
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.font = { name: 'Aptos', size: 11, color: { argb: colors.text } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.deep } }
      cell.border = { bottom: { style: 'thin', color: { argb: colors.border } } }
      cell.alignment = { vertical: 'middle', wrapText: true }
    })
  })
  const header = sheet.getRow(1)
  header.height = 28
  header.eachCell((cell) => {
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: colors.text } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.panel } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
}

function writePairs(sheet: ExcelJS.Worksheet, rows: Array<[string, unknown]>) {
  sheet.columns = [
    { header: 'Field', key: 'field', width: 30 },
    { header: 'Value', key: 'value', width: 72 },
  ]
  rows.forEach(([field, value]) => sheet.addRow({ field, value: safe(value) }))
  decorateSheet(sheet)
  sheet.getColumn('field').eachCell((cell, rowNumber) => {
    if (rowNumber === 1) return
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: colors.muted } }
  })
}

function writeTable(sheet: ExcelJS.Worksheet, headers: string[], rows: unknown[][]) {
  sheet.addRow(headers)
  rows.forEach((row) => sheet.addRow(row.map(safe)))
  sheet.columns = headers.map((header) => ({ header, width: Math.min(Math.max(header.length + 8, 16), 42) }))
  decorateSheet(sheet)
}

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('firm_id').eq('id', user.id).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const [
    { data: deal },
    { data: firm },
    { data: stages },
    { data: snapshots },
    { data: notes },
    { data: files },
    { data: events },
    { data: scores },
  ] = await Promise.all([
    supabase.from('deals').select('*').eq('id', id).eq('firm_id', profile.firm_id).maybeSingle(),
    supabase.from('firms').select('name').eq('id', profile.firm_id).maybeSingle(),
    supabase.from('deal_stages').select('id, name, position, is_terminal').eq('firm_id', profile.firm_id),
    supabase.from('deal_financial_snapshots').select('*').eq('deal_id', id).eq('firm_id', profile.firm_id).order('created_at', { ascending: false }).limit(1),
    supabase.from('deal_notes').select('section, content').eq('deal_id', id).eq('firm_id', profile.firm_id),
    supabase.from('deal_files').select('filename, size_bytes, created_at').eq('deal_id', id).eq('firm_id', profile.firm_id).order('created_at', { ascending: false }),
    supabase.from('deal_events').select('event_type, notes, kill_reason_id, created_at, kill_reasons(name)').eq('deal_id', id).eq('firm_id', profile.firm_id).order('created_at', { ascending: false }),
    supabase.from('deal_scores').select('score, notes, scoring_criteria(name)').eq('deal_id', id).eq('firm_id', profile.firm_id),
  ])

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const latestSnapshot = snapshots?.[0] ?? null
  const stage = (stages ?? []).find((item: any) => item.id === deal.stage_id) ?? null
  const scoreValues = (scores ?? []).map((score: any) => Number(score.score)).filter((score: number) => Number.isFinite(score))
  const buyBoxScore = scoreValues.length
    ? Math.round(scoreValues.reduce((sum: number, score: number) => sum + score, 0) / scoreValues.length * 20)
    : null

  const readinessInput = {
    title: deal.title,
    market: deal.market,
    address: deal.address,
    dealType: deal.deal_type,
    sourceName: deal.source_name,
    dealStructure: deal.deal_structure,
    financingType: deal.financing_type,
    propertySize: deal.property_size,
    askingPrice: deal.asking_price,
    stage,
    isArchived: deal.is_archived,
    purchasePrice: latestSnapshot?.purchase_price ?? null,
    noi: latestSnapshot?.noi ?? null,
    capRate: latestSnapshot?.cap_rate ?? null,
    debtRate: latestSnapshot?.debt_rate ?? null,
    ltv: latestSnapshot?.ltv ?? null,
    irr: latestSnapshot?.irr ?? null,
    squareFootage: latestSnapshot?.square_footage ?? null,
    yearBuilt: latestSnapshot?.year_built ?? null,
    numUnits: latestSnapshot?.num_units ?? null,
    occupancyRate: latestSnapshot?.occupancy_rate ?? null,
    currentRent: latestSnapshot?.current_rent ?? null,
    marketRent: latestSnapshot?.market_rent ?? null,
    vacancyRate: latestSnapshot?.vacancy_rate ?? null,
    propertyTaxes: latestSnapshot?.property_taxes ?? null,
    insurance: latestSnapshot?.insurance ?? null,
    buyBoxScore,
    notes: notes ?? [],
    files: files ?? [],
    events: events ?? [],
    scoreDetails: scores ?? [],
  }
  const readiness = buildYardiReadiness(readinessInput)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Dealstash'
  workbook.created = new Date()
  workbook.modified = new Date()
  workbook.properties.date1904 = false

  const summary = workbook.addWorksheet('Deal Summary')
  writePairs(summary, [
    ['Property', deal.title],
    ['Firm', firm?.name],
    ['Address', deal.address],
    ['Market', deal.market],
    ['Asset type', deal.deal_type],
    ['Sponsor / broker', deal.source_name],
    ['Stage', stage?.name],
    ['Decision', readiness.decision],
    ['Decision rationale', readiness.rationale],
    ['Export ready', readiness.ready ? 'Yes' : 'No'],
    ['Export readiness score', `${readiness.score}%`],
    ['Missing fields', readiness.missing.join(', ')],
  ])

  const financials = workbook.addWorksheet('Financials')
  writePairs(financials, [
    ['Asking price', moneyCell(deal.asking_price)],
    ['Purchase price', moneyCell(latestSnapshot?.purchase_price ?? deal.asking_price)],
    ['NOI', moneyCell(latestSnapshot?.noi)],
    ['Cap rate', percentCell(latestSnapshot?.cap_rate)],
    ['Debt rate', percentCell(latestSnapshot?.debt_rate)],
    ['LTV', percentCell(latestSnapshot?.ltv)],
    ['Projected IRR', percentCell(latestSnapshot?.irr)],
    ['Property size', deal.property_size],
    ['Square footage', latestSnapshot?.square_footage],
    ['Units', latestSnapshot?.num_units],
    ['Year built', latestSnapshot?.year_built],
    ['Occupancy', percentCell(latestSnapshot?.occupancy_rate)],
    ['Vacancy', percentCell(latestSnapshot?.vacancy_rate)],
    ['Current rent', moneyCell(latestSnapshot?.current_rent)],
    ['Market rent', moneyCell(latestSnapshot?.market_rent)],
    ['Property taxes', moneyCell(latestSnapshot?.property_taxes)],
    ['Insurance', moneyCell(latestSnapshot?.insurance)],
    ['Deal structure', deal.deal_structure],
    ['Financing type', deal.financing_type],
  ])
  financials.getColumn(2).numFmt = '$#,##0;[Red]($#,##0);-'
  ;[4, 5, 6, 7, 12, 13].forEach((row) => { financials.getCell(`B${row}`).numFmt = '0.00%' })

  const scoring = workbook.addWorksheet('Scoring')
  writeTable(scoring, ['Criterion', 'Score', 'Score / 100', 'Notes'], (scores ?? []).map((score: any) => [
    relationName(score.scoring_criteria) || 'Criterion',
    score.score ?? '',
    score.score ? Number(score.score) * 20 : '',
    score.notes ?? '',
  ]))

  const notesSheet = workbook.addWorksheet('Notes & Risks')
  writePairs(notesSheet, [
    ['Overview', noteBySection(notes, 'overview')],
    ['Risks', noteBySection(notes, 'risks')],
    ['Notes', noteBySection(notes, 'notes')],
  ])

  const activity = workbook.addWorksheet('Files & Activity')
  writeTable(activity, ['Type', 'Name / Event', 'Notes', 'Date'], [
    ...(files ?? []).map((file: any) => ['File', file.filename ?? '', file.size_bytes ? `${Number(file.size_bytes).toLocaleString()} bytes` : '', file.created_at ?? '']),
    ...(events ?? []).map((event: any) => ['Event', event.event_type ?? '', event.notes ?? relationName(event.kill_reasons), event.created_at ?? '']),
  ])

  const readinessSheet = workbook.addWorksheet('Readiness')
  writeTable(readinessSheet, ['Field', 'Status', 'Value / Help'], readiness.items.map((item) => [
    item.label,
    item.complete ? 'Complete' : 'Missing',
    item.complete ? item.value || 'Captured' : item.help,
  ]))

  for (const sheet of workbook.worksheets) {
    sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    sheet.autoFilter = sheet.rowCount > 1 ? { from: 'A1', to: sheet.getRow(1).getCell(sheet.columnCount).address } : undefined
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const safeName = deal.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'deal'

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safeName}-export-record.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
