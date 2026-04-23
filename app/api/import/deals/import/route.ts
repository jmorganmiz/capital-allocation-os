import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ColumnMapping } from '@/app/api/import/deals/map-columns/route'

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestBody = {
  allRows: Record<string, string>[]
  columnMappings: ColumnMapping[]
  stageResolutions: Record<string, string | null>
  ownerUserId: string | null
}

export type ImportResponse = {
  imported: number
  skipped: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NUMERIC_FIELDS = new Set(['asking_price', 'property_size'])
const BATCH_SIZE = 100

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNumeric(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

type DealInsert = Record<string, string | number | null>

function rowToDeal(
  row: Record<string, string>,
  columnMappings: ColumnMapping[],
  stageResolutions: Record<string, string | null>,
  ownerUserId: string | null,
  firmId: string,
): DealInsert | null {
  const deal: DealInsert = { firm_id: firmId }

  for (const mapping of columnMappings) {
    if (!mapping.schema_field) continue

    const raw = row[mapping.csv_column]?.trim()
    if (!raw) continue

    if (mapping.schema_field === 'stage_id') {
      const stageId = stageResolutions[raw] ?? null
      if (stageId) deal['stage_id'] = stageId
      continue
    }

    if (NUMERIC_FIELDS.has(mapping.schema_field)) {
      const n = parseNumeric(raw)
      if (n !== null) deal[mapping.schema_field] = n
      continue
    }

    deal[mapping.schema_field] = raw
  }

  if (ownerUserId) deal['owner_user_id'] = ownerUserId

  if (!deal['title']) return null

  return deal
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    return NextResponse.json({ error: 'No firm found' }, { status: 404 })
  }

  const firmId: string = profile.firm_id

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { allRows, columnMappings, stageResolutions, ownerUserId } = body

  if (!Array.isArray(allRows) || !Array.isArray(columnMappings)) {
    return NextResponse.json({ error: 'Invalid request shape' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('deals')
    .select('title')
    .eq('firm_id', firmId)

  const existingTitles = new Set(
    (existing ?? []).map((d) => d.title.toLowerCase().trim()),
  )

  const toInsert: DealInsert[] = []
  let skipped = 0

  for (const row of allRows) {
    const deal = rowToDeal(row, columnMappings, stageResolutions, ownerUserId, firmId)
    if (!deal) {
      skipped++
      continue
    }

    const titleKey = (deal['title'] as string).toLowerCase().trim()
    if (existingTitles.has(titleKey)) {
      skipped++
      continue
    }

    existingTitles.add(titleKey)
    toInsert.push(deal)
  }

  let imported = 0
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('deals').insert(batch)
    if (error) {
      console.error('Batch insert error:', error)
      return NextResponse.json({ error: 'Import failed during insert' }, { status: 500 })
    }
    imported += batch.length
  }

  return NextResponse.json({ imported, skipped } satisfies ImportResponse)
}
