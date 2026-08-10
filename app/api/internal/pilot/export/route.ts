import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { can, getInternalContext } from '@/lib/internal/auth'
import { getPilotAnalytics, pilotFirmRows, toCsv, yardiReadyRows } from '@/lib/pilot-analytics'

export async function GET(request: Request) {
  const context = await getInternalContext()
  if (!context || !can(context, 'ops')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const mode = new URL(request.url).searchParams.get('mode')
  const analytics = await getPilotAnalytics(createAdminClient())
  const rows = mode === 'yardi' ? yardiReadyRows(analytics) : pilotFirmRows(analytics)
  const csv = toCsv(rows)
  const filename = mode === 'yardi' ? 'dealstash-export-ready-records.csv' : 'dealstash-pilot-summary.csv'

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}