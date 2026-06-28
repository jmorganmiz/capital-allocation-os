import { NextRequest, NextResponse } from 'next/server'
import { getFirmContext } from '@/lib/auth'
import { parseOMBuffer } from '@/lib/parse-om-core'
import { checkAiRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    return await handleParseOM(req)
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    console.error('[parse-om] UNHANDLED top-level exception:', detail)
    return NextResponse.json({ error: 'parse_failed', detail }, { status: 500 })
  }
}

async function handleParseOM(req: NextRequest): Promise<NextResponse> {
  const context = await getFirmContext()
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status })
  }
  const rateLimit = await checkAiRateLimit(context.supabase, context.user.id, 'parse-om', 5)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.error }, { status: 429 })
  }

  // ── Parse JSON body: { storagePath, bucket? } ─────────────────────────────
  let body: { storagePath?: string }
  try {
    body = await req.json()
  } catch (err) {
    console.error('[parse-om] req.json() failed:', err)
    return NextResponse.json({ error: 'bad_request', detail: 'Expected JSON body with storagePath' }, { status: 400 })
  }

  const { storagePath } = body
  if (!storagePath) {
    console.error('[parse-om] storagePath missing from body')
    return NextResponse.json({ error: 'bad_request', detail: 'storagePath is required' }, { status: 400 })
  }
  const expectedPrefix = `${context.profile.firm_id}/`
  if (!storagePath.startsWith(expectedPrefix) || storagePath.includes('..')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // ── Download file from Supabase Storage ───────────────────────────────────
  let buffer: Buffer
  try {
    const { data, error } = await context.supabase.storage.from('deal-files').download(storagePath)
    if (error) throw error
    const bytes = await data.arrayBuffer()
    buffer = Buffer.from(bytes)
    if (buffer.length > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'pdf_too_large' }, { status: 413 })
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[parse-om] storage download failed:', detail)
    return NextResponse.json({ error: 'storage_error', detail }, { status: 500 })
  }

  // ── Parse via shared core (text path → vision fallback) ───────────────────
  const result = await parseOMBuffer(buffer)

  if ('error' in result) {
    const status = result.error === 'pdf_too_large'  ? 413
                 : result.error === 'api_key_missing' ? 503
                 : 500
    return NextResponse.json(result, { status })
  }

  return NextResponse.json(result)
}
