import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { Json } from '@/lib/types/database'

type MemoData = { title: string; market: string | null; output: Record<string, Json>; locked: Record<string, Json>; sources: Array<{ title: string; locator: string | null; excerpt: string | null }> }

export async function createIcMemoPdf(data: MemoData) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const navy = rgb(0.07, 0.08, 0.14), blue = rgb(0.32, 0.4, 0.92), gray = rgb(0.38, 0.4, 0.48)
  const addPage = () => pdf.addPage([612, 792])
  let page = addPage(), y = 742
  const text = (value: string, x: number, size = 10, font = regular, color = navy) => { page.drawText(value, { x, y, size, font, color }); y -= size + 7 }
  const line = () => { page.drawLine({ start: { x: 48, y }, end: { x: 564, y }, thickness: 0.7, color: rgb(.85,.86,.89) }); y -= 18 }
  const wrap = (value: string, width = 88) => value.match(new RegExp(`.{1,${width}}(?:\\s|$)`, 'g'))?.map(v => v.trim()) ?? [value]
  const section = (label: string) => { y -= 8; text(label.toUpperCase(), 48, 8, bold, blue); line() }
  const pct = (v: Json | undefined) => Number.isFinite(Number(v)) ? `${(Number(v) * 100).toFixed(1)}%` : '-'
  const mult = (v: Json | undefined) => Number.isFinite(Number(v)) ? `${Number(v).toFixed(2)}x` : '-'
  const money = (v: Json | undefined) => Number.isFinite(Number(v)) ? `$${Math.round(Number(v)).toLocaleString()}` : '-'

  text('DEALSTASH / INVESTMENT COMMITTEE', 48, 9, bold, blue)
  text(data.title, 48, 24, bold)
  text(data.market ?? 'Market not specified', 48, 11, regular, gray)
  y -= 10; line()
  section('Underwriting summary')
  const metrics = [['Levered IRR', pct(data.output.leveredIrr)], ['Equity multiple', mult(data.output.equityMultiple)], ['Year 1 DSCR', mult(data.output.yearOneDscr)], ['Required equity', money(data.output.totalEquityInvested)], ['Exit value', money(data.output.grossExitValue)]]
  metrics.forEach(([label, value], index) => { const x = 48 + (index % 3) * 172; const rowY = 610 - Math.floor(index / 3) * 58; page.drawText(label, { x, y: rowY, size: 8, font: regular, color: gray }); page.drawText(value, { x, y: rowY - 20, size: 15, font: bold, color: navy }) })
  y = 475
  section('Investment thesis')
  for (const row of wrap(String(data.locked.investment_thesis ?? 'No investment thesis recorded.'))) text(row, 48, 9)
  section('Risk narrative')
  for (const row of wrap(String(data.locked.risk_narrative ?? 'No risk narrative recorded.'))) text(row, 48, 9)
  section('Approval')
  text(`Package approved: ${String(data.locked.approved_at ?? 'Not recorded')}`, 48, 9)
  text(`Model version: ${String(data.output.modelVersion ?? 'Not recorded')}`, 48, 9)

  page = addPage(); y = 742
  text('SOURCE APPENDIX', 48, 9, bold, blue)
  text(data.title, 48, 19, bold); line()
  if (!data.sources.length) text('No cited sources were attached to this run.', 48, 9, regular, gray)
  data.sources.forEach((source, index) => {
    if (y < 110) { page = addPage(); y = 742 }
    text(`${index + 1}. ${source.title}${source.locator ? ` / ${source.locator}` : ''}`, 48, 10, bold)
    for (const row of wrap(source.excerpt ?? 'No excerpt retained.', 92).slice(0, 5)) text(row, 60, 8, regular, gray)
    y -= 8
  })
  const pages = pdf.getPages()
  pages.forEach((item, index) => item.drawText(`Dealstash confidential / ${index + 1} of ${pages.length}`, { x: 48, y: 28, size: 7, font: regular, color: gray }))
  return Buffer.from(await pdf.save())
}

