import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib'
import type { Json } from '@/lib/types/database'

type MemoEvidence = {
  label: string
  value: Json
  unit: string | null
  source_reference: string | null
  source_excerpt: string | null
  confidence: number | null
}

type MemoData = {
  title: string
  market: string | null
  output: Record<string, Json>
  locked: Record<string, Json>
  evidence: MemoEvidence[]
}

type DrawOptions = {
  x?: number
  width?: number
  size?: number
  font?: PDFFont
  color?: ReturnType<typeof rgb>
  lineHeight?: number
  maxLines?: number
}

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 48
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

function clean(value: unknown) {
  return String(value ?? '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function linesFor(text: string, font: PDFFont, size: number, width: number) {
  const words = clean(text).split(' ').filter(Boolean)
  if (!words.length) return ['']
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      current = candidate
      continue
    }
    if (current) lines.push(current)
    current = word
  }
  if (current) lines.push(current)
  return lines
}

function formatDate(value: Json | undefined) {
  const date = new Date(String(value ?? ''))
  if (Number.isNaN(date.getTime())) return 'Not recorded'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
  }).format(date)
}

function formatValue(value: Json, unit: string | null) {
  const number = Number(value)
  if (!Number.isFinite(number)) return clean(value)
  if (unit === '%') return `${(number * 100).toFixed(2).replace(/\.00$/, '')}%`
  if (unit?.startsWith('$')) {
    const suffix = unit === '$' ? '' : ` ${unit.slice(1)}`
    return `$${number.toLocaleString('en-US', { maximumFractionDigits: 0 })}${suffix}`
  }
  return `${number.toLocaleString('en-US', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`
}

export async function createIcMemoPdf(data: MemoData) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const navy = rgb(0.07, 0.08, 0.14)
  const white = rgb(1, 1, 1)
  const blue = rgb(0.32, 0.4, 0.92)
  const paleBlue = rgb(0.94, 0.95, 1)
  const gray = rgb(0.38, 0.4, 0.48)
  const lightGray = rgb(0.85, 0.86, 0.89)
  const faint = rgb(0.97, 0.97, 0.98)
  let page!: PDFPage
  let y = 0

  const newPage = (kicker: string, title: string) => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: white })
    y = 742
    page.drawText(clean(kicker).toUpperCase(), { x: MARGIN, y, size: 8, font: bold, color: blue })
    y -= 28
    page.drawText(clean(title), { x: MARGIN, y, size: 21, font: bold, color: navy })
    y -= 18
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.7, color: lightGray })
    y -= 22
  }

  const drawWrapped = (value: unknown, options: DrawOptions = {}) => {
    const x = options.x ?? MARGIN
    const width = options.width ?? CONTENT_WIDTH
    const size = options.size ?? 9
    const font = options.font ?? regular
    const color = options.color ?? navy
    const lineHeight = options.lineHeight ?? size + 4
    const rows = linesFor(clean(value), font, size, width).slice(0, options.maxLines)
    rows.forEach((row) => {
      page.drawText(row, { x, y, size, font, color })
      y -= lineHeight
    })
    return rows.length
  }

  const section = (label: string, detail?: string) => {
    y -= 7
    page.drawText(clean(label).toUpperCase(), { x: MARGIN, y, size: 8, font: bold, color: blue })
    if (detail) {
      const detailText = clean(detail)
      page.drawText(detailText, { x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(detailText, 7), y, size: 7, font: regular, color: gray })
    }
    y -= 12
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.7, color: lightGray })
    y -= 18
  }

  const pct = (value: Json | undefined) => Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(1)}%` : '-'
  const mult = (value: Json | undefined) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}x` : '-'
  const money = (value: Json | undefined) => Number.isFinite(Number(value)) ? `$${Math.round(Number(value)).toLocaleString()}` : '-'

  // Page 1: decision summary.
  newPage('Dealstash / Investment Committee', data.title)
  drawWrapped(data.market ?? 'Market not specified', { size: 10, color: gray, lineHeight: 14 })
  section('Underwriting summary', `Model ${clean(data.output.modelVersion ?? 'not recorded')}`)
  const metrics = [
    ['Levered IRR', pct(data.output.leveredIrr)],
    ['Equity multiple', mult(data.output.equityMultiple)],
    ['Year 1 DSCR', mult(data.output.yearOneDscr)],
    ['Required equity', money(data.output.totalEquityInvested)],
    ['Exit value', money(data.output.grossExitValue)],
  ]
  metrics.forEach(([label, value], index) => {
    const cardWidth = 164
    const x = MARGIN + (index % 3) * 176
    const row = Math.floor(index / 3)
    const top = y - row * 58
    page.drawRectangle({ x, y: top - 42, width: cardWidth, height: 48, color: faint, borderColor: lightGray, borderWidth: 0.6 })
    page.drawText(label, { x: x + 10, y: top - 8, size: 7, font: regular, color: gray })
    page.drawText(value, { x: x + 10, y: top - 29, size: 14, font: bold, color: navy })
  })
  y -= 120
  section('Investment thesis')
  drawWrapped(data.locked.investment_thesis ?? 'No investment thesis recorded.', { size: 9, lineHeight: 13 })
  section('Risk narrative')
  drawWrapped(data.locked.risk_narrative ?? 'No risk narrative recorded.', { size: 9, lineHeight: 13 })
  y -= 4
  page.drawRectangle({ x: MARGIN, y: y - 20, width: CONTENT_WIDTH, height: 28, color: paleBlue })
  page.drawText('CURRENT STATUS', { x: MARGIN + 10, y: y - 8, size: 7, font: bold, color: blue })
  page.drawText('Screening assumptions were approved for this run; confirmatory diligence remains outstanding.', { x: MARGIN + 95, y: y - 8, size: 7.5, font: regular, color: navy })
  y -= 34
  section('Approval record')
  drawWrapped(`Package approved ${formatDate(data.locked.approved_at)} by an authorized firm user. Screening assumptions were explicitly approved for this model run; approval does not replace confirmatory diligence.`, { size: 8.5, color: gray, lineHeight: 12 })

  // Page 2: approved assumptions, sensitivity, and limitations.
  newPage('Decision inputs', 'Assumptions, sensitivity, and limitations')
  const assumptions = Array.isArray(data.locked.assumptions)
    ? data.locked.assumptions.filter((item): item is Record<string, Json> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : []
  section('Approved screening assumptions', `${assumptions.length} inputs`)
  page.drawText('ASSUMPTION', { x: MARGIN + 8, y, size: 6.5, font: bold, color: gray })
  page.drawText('APPROVED VALUE', { x: 250, y, size: 6.5, font: bold, color: gray })
  page.drawText('BASIS', { x: 345, y, size: 6.5, font: bold, color: gray })
  y -= 18
  assumptions.forEach((assumption, index) => {
    const rowTop = y
    if (index % 2 === 0) page.drawRectangle({ x: MARGIN, y: rowTop - 29, width: CONTENT_WIDTH, height: 34, color: faint })
    page.drawText(clean(assumption.label ?? assumption.key ?? 'Assumption'), { x: MARGIN + 8, y: rowTop - 7, size: 8.5, font: bold, color: navy })
    const value = formatValue(assumption.value ?? null, assumption.unit ? clean(assumption.unit) : null)
    page.drawText(value, { x: 250, y: rowTop - 7, size: 8.5, font: bold, color: navy })
    const source = clean(assumption.source_reference ?? assumption.source_type ?? 'Analyst-approved screening input')
    page.drawText(source.slice(0, 55), { x: 345, y: rowTop - 7, size: 7, font: regular, color: gray })
    y -= 34
  })
  const sensitivity = data.output.sensitivity && typeof data.output.sensitivity === 'object' && !Array.isArray(data.output.sensitivity)
    ? data.output.sensitivity as Record<string, Json>
    : {}
  const exitShifts = Array.isArray(sensitivity.exit_cap_shifts) ? sensitivity.exit_cap_shifts.map(Number) : []
  const growthShifts = Array.isArray(sensitivity.rent_growth_shifts) ? sensitivity.rent_growth_shifts.map(Number) : []
  const sensitivityValues = Array.isArray(sensitivity.levered_irr) ? sensitivity.levered_irr as Json[] : []
  section('Levered IRR sensitivity', 'Rows: rent growth / Columns: exit cap')
  if (exitShifts.length && growthShifts.length) {
    const labelWidth = 110
    const cellWidth = (CONTENT_WIDTH - labelWidth) / exitShifts.length
    const rowHeight = 30
    page.drawRectangle({ x: MARGIN, y: y - rowHeight + 8, width: CONTENT_WIDTH, height: rowHeight, color: paleBlue })
    page.drawText('Growth / Exit', { x: MARGIN + 9, y: y - 10, size: 7.5, font: bold, color: navy })
    exitShifts.forEach((shift, index) => page.drawText(`${shift >= 0 ? '+' : ''}${(shift * 100).toFixed(1)}%`, { x: MARGIN + labelWidth + index * cellWidth + 18, y: y - 10, size: 7.5, font: bold, color: navy }))
    y -= rowHeight
    growthShifts.forEach((shift, rowIndex) => {
      if (rowIndex % 2 === 0) page.drawRectangle({ x: MARGIN, y: y - rowHeight + 8, width: CONTENT_WIDTH, height: rowHeight, color: faint })
      page.drawText(`${shift >= 0 ? '+' : ''}${(shift * 100).toFixed(1)}%`, { x: MARGIN + 9, y: y - 10, size: 8, font: regular, color: gray })
      const values = Array.isArray(sensitivityValues[rowIndex]) ? sensitivityValues[rowIndex] as Json[] : []
      values.forEach((value, columnIndex) => {
        const isBase = shift === 0 && exitShifts[columnIndex] === 0
        const formatted = pct(value)
        page.drawText(formatted, { x: MARGIN + labelWidth + columnIndex * cellWidth + 18, y: y - 10, size: 8, font: isBase ? bold : regular, color: isBase ? blue : navy })
      })
      y -= rowHeight
    })
  } else {
    drawWrapped('Sensitivity output was not available for this run.', { size: 8.5, color: gray })
  }
  const warnings = Array.isArray(data.output.warnings) ? data.output.warnings.map(clean).filter(Boolean) : []
  section('Model limitations', `${warnings.length} disclosed`)
  warnings.forEach((warning, index) => {
    page.drawText(`${index + 1}.`, { x: MARGIN, y, size: 8, font: bold, color: blue })
    drawWrapped(warning, { x: MARGIN + 18, width: CONTENT_WIDTH - 18, size: 8, color: gray, lineHeight: 11 })
    y -= 4
  })

  // Page 3: grouped, labeled source evidence.
  newPage('Source appendix', data.title)
  const grouped = new Map<string, { reference: string; excerpt: string; facts: MemoEvidence[] }>()
  data.evidence.forEach((fact) => {
    const reference = clean(fact.source_reference ?? 'Source not recorded')
    const excerpt = clean(fact.source_excerpt ?? 'No excerpt retained.')
    const key = `${reference}|${excerpt}`
    const current = grouped.get(key) ?? { reference, excerpt, facts: [] }
    current.facts.push(fact)
    grouped.set(key, current)
  })
  section('Approved document evidence', `${data.evidence.length} facts / ${grouped.size} source excerpts`)
  if (!grouped.size) drawWrapped('No approved cited evidence was attached to this run.', { size: 9, color: gray })
  ;[...grouped.values()].forEach((group, groupIndex) => {
    const factLines = group.facts.length
    const excerptLines = Math.min(5, linesFor(group.excerpt, regular, 7.5, CONTENT_WIDTH - 24).length)
    const needed = 48 + factLines * 17 + excerptLines * 10
    if (y - needed < 55) {
      newPage('Source appendix continued', data.title)
    }
    page.drawRectangle({ x: MARGIN, y: y - 22, width: CONTENT_WIDTH, height: 28, color: paleBlue })
    page.drawText(`${groupIndex + 1}. ${group.reference}`, { x: MARGIN + 10, y: y - 11, size: 8.5, font: bold, color: navy })
    y -= 34
    group.facts.forEach((fact) => {
      const confidence = fact.confidence == null ? 'confidence not recorded' : `${Math.round(fact.confidence * 100)}% extraction confidence`
      const summary = `${clean(fact.label)}: ${formatValue(fact.value, fact.unit)} - analyst approved; ${confidence}`
      drawWrapped(summary, { x: MARGIN + 10, width: CONTENT_WIDTH - 20, size: 8, lineHeight: 11, font: bold })
      y -= 3
    })
    page.drawText('Retained source excerpt', { x: MARGIN + 10, y, size: 7, font: bold, color: blue })
    y -= 12
    drawWrapped(group.excerpt, { x: MARGIN + 10, width: CONTENT_WIDTH - 20, size: 7.5, color: gray, lineHeight: 10, maxLines: 5 })
    y -= 14
  })

  const pages = pdf.getPages()
  pages.forEach((item, index) => {
    item.drawLine({ start: { x: MARGIN, y: 42 }, end: { x: PAGE_WIDTH - MARGIN, y: 42 }, thickness: 0.5, color: lightGray })
    item.drawText(`Dealstash confidential | ${index + 1} of ${pages.length}`, { x: MARGIN, y: 27, size: 7, font: regular, color: gray })
  })
  return Buffer.from(await pdf.save())
}
