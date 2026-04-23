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

// asking_price is numeric; property_size is TEXT in the deals table — do not coerce it
const NUMERIC_FIELDS = new Set(['asking_price'])
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
  userId: string,
): DealInsert | null {
  const deal: DealInsert = {
    firm_id:     firmId,
    created_by:  userId,
    intake_type: 'manual',
  }

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

    // All other fields including property_size are stored as text
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
    console.error('[import] No firm_id found for user', user.id)
    return NextResponse.json({ error: 'No firm found' }, { status: 404 })
  }

  const firmId: string = profile.firm_id
  console.log('[import] Starting import — user:', user.id, 'firm:', firmId)

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

  console.log('[import] Received', allRows.length, 'rows,', columnMappings.length, 'mappings')
  console.log('[import] Column mappings:', JSON.stringify(columnMappings))
  console.log('[import] Stage resolutions:', JSON.stringify(stageResolutions))
  console.log('[import] Owner user ID:', ownerUserId)

  const { data: existing, error: fetchError } = await supabase
    .from('deals')
    .select('title')
    .eq('firm_id', firmId)

  if (fetchError) {
    console.error('[import] Failed to fetch existing deals:', fetchError)
    return NextResponse.json({ error: 'Could not check for duplicates' }, { status: 500 })
  }

  const existingTitles = new Set(
    (existing ?? []).map((d) => d.title.toLowerCase().trim()),
  )

  const toInsert: DealInsert[] = []
  let skipped = 0

  for (const row of allRows) {
    const deal = rowToDeal(row, columnMappings, stageResolutions, ownerUserId, firmId, user.id)
    if (!deal) {
      console.log('[import] Skipping row — no title after mapping:', JSON.stringify(row))
      skipped++
      continue
    }

    const titleKey = (deal['title'] as string).toLowerCase().trim()
    if (existingTitles.has(titleKey)) {
      console.log('[import] Skipping duplicate title:', deal['title'])
      skipped++
      continue
    }

    existingTitles.add(titleKey)
    toInsert.push(deal)
  }

  console.log('[import] Prepared', toInsert.length, 'deals to insert,', skipped, 'skipped')
  if (toInsert.length > 0) {
    console.log('[import] Sample deal (first row):', JSON.stringify(toInsert[0]))
  }

  let imported = 0
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE)
    console.log(`[import] Inserting batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} rows)`)

    const { error } = await supabase.from('deals').insert(batch)

    if (error) {
      console.error('[import] Batch insert failed:', {
        message: error.message,
        code:    error.code,
        details: error.details,
        hint:    error.hint,
        batch_size: batch.length,
        sample_deal: JSON.stringify(batch[0]),
      })
      return NextResponse.json(
        {
          error:   'Import failed during insert',
          details: error.message,
          hint:    error.hint ?? null,
          code:    error.code ?? null,
        },
        { status: 500 },
      )
    }

    imported += batch.length
    console.log('[import] Batch inserted OK, running total:', imported)
  }

  console.log('[import] Complete — imported:', imported, 'skipped:', skipped)
  return NextResponse.json({ imported, skipped } satisfies ImportResponse)
}
