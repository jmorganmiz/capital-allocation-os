import { NextResponse } from 'next/server'
import { rowsToCsv, yardiDealCsvRow } from '@/lib/yardi-readiness'
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
    supabase.from('deal_files').select('id').eq('deal_id', id).eq('firm_id', profile.firm_id),
    supabase.from('deal_events').select('event_type, notes, kill_reason_id, kill_reasons(name)').eq('deal_id', id).eq('firm_id', profile.firm_id),
    supabase.from('deal_scores').select('score').eq('deal_id', id).eq('firm_id', profile.firm_id),
  ])

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const latestSnapshot = snapshots?.[0] ?? null
  const stage = (stages ?? []).find((item) => item.id === deal.stage_id) ?? null
  const scoreValues = (scores ?? []).map((score) => Number(score.score)).filter((score) => Number.isFinite(score))
  const buyBoxScore = scoreValues.length
    ? Math.round(scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length * 20)
    : null

  const row = yardiDealCsvRow({
    dealId: deal.id,
    firmName: firm?.name ?? null,
    title: deal.title,
    market: deal.market,
    address: deal.address,
    dealType: deal.deal_type,
    sourceName: deal.source_name,
    askingPrice: deal.asking_price,
    stage,
    isArchived: deal.is_archived,
    purchasePrice: latestSnapshot?.purchase_price ?? null,
    noi: latestSnapshot?.noi ?? null,
    capRate: latestSnapshot?.cap_rate ?? null,
    buyBoxScore,
    notes: notes ?? [],
    files: files ?? [],
    events: events ?? [],
  })

  const safeName = deal.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'deal'
  return new NextResponse(rowsToCsv([row]), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}-yardi-record.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
