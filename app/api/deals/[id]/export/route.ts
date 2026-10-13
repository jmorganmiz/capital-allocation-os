import { NextResponse } from 'next/server'
import { calculateOverallScore } from '@/lib/workflow.mjs'
import { rowsToCsv, exportDealCsvRow } from '@/lib/export-readiness'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
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
    supabase.from('deal_files').select('filename, size_bytes').eq('deal_id', id).eq('firm_id', profile.firm_id).order('created_at', { ascending: false }),
    supabase.from('deal_events').select('event_type, notes, kill_reason_id, created_at, kill_reasons(name)').eq('deal_id', id).eq('firm_id', profile.firm_id).order('created_at', { ascending: false }),
    supabase.from('deal_scores').select('score, notes, scoring_criteria(name)').eq('deal_id', id).eq('firm_id', profile.firm_id),
  ])

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const latestSnapshot = snapshots?.[0] ?? null
  const stage = (stages ?? []).find((item) => item.id === deal.stage_id) ?? null
  const scoreValues = (scores ?? []).map((score) => Number(score.score)).filter((score) => Number.isFinite(score))
  const buyBoxScore = calculateOverallScore(scoreValues)

  const row = exportDealCsvRow({
    dealId: deal.id,
    firmName: firm?.name ?? null,
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
    scoreDetails: scores ?? [],
    notes: notes ?? [],
    files: files ?? [],
    events: events ?? [],
  })

  const safeName = deal.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'deal'
  return new NextResponse(rowsToCsv([row]), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}-export-record.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
