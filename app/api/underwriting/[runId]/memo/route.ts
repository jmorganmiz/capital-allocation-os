import { NextResponse } from 'next/server'
import { createIcMemoPdf } from '@/lib/ic-memo-pdf'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/types/database'

export const runtime = 'nodejs'

export async function GET(_: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  const { data: run } = await supabase.from('underwriting_runs').select('*, deals(title, market)').eq('id', runId).eq('run_type', 'full_underwrite').single()
  if (!run || run.status !== 'completed' || !run.output_snapshot) return NextResponse.json({ error: 'Completed underwrite not found.' }, { status: 404 })
  const { data: sources } = await supabase.from('underwriting_sources').select('title, locator, excerpt').eq('run_id', runId).order('created_at')
  const input = run.input_snapshot as Record<string, Json>
  const locked = (input.locked_preflight ?? {}) as Record<string, Json>
  const deal = run.deals as unknown as { title: string; market: string | null }
  const pdf = await createIcMemoPdf({ title: deal.title, market: deal.market, output: run.output_snapshot as Record<string, Json>, locked, sources: sources ?? [] })
  return new NextResponse(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${deal.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-ic-memo.pdf"`, 'Cache-Control': 'private, no-store' } })
}

