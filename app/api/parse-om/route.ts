import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// Max PDF size we'll send to the vision API (50 MB).
// Note: Anthropic's pdfs-2024-09-25 beta accepts up to ~32 MB raw;
// files above that will fail in the vision path with parse_failed.
// Text-based PDFs have no effective size limit (text is truncated to 15k chars).
const MAX_VISION_BYTES = 50 * 1024 * 1024

const EXTRACTION_PROMPT = `You are a real estate data extraction assistant. Extract key deal data from the following offering memorandum and respond with ONLY a valid JSON object using exactly these keys:

- address (string): Full property address
- asking_price (number): Asking/list price in dollars, digits only, no formatting
- noi (number): Net Operating Income in dollars, digits only, no formatting
- cap_rate (number): Cap rate as a decimal (e.g. 0.065 for 6.5%)
- property_type (string): One of: multifamily, retail, office, industrial, hospitality, self_storage, mixed_use, land, other
- square_footage (number): Total square footage, digits only
- year_built (number): Four-digit year the property was built
- num_units (number): Number of units for multifamily/self-storage, null otherwise
- occupancy_rate (number): Occupancy as decimal (e.g. 0.95 for 95%)
- broker_name (string): Broker's full name
- brokerage (string): Brokerage firm name
- market (string): City and state (e.g. "Austin, TX")

Return null for any field not found. Return ONLY the JSON object, no explanation or markdown fences.`

function extractJSON(text: string): object | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

function logErr(label: string, err: unknown) {
  if (err instanceof Error) {
    console.error(`[parse-om] ${label}: ${err.name}: ${err.message}`)
    if (err.stack) console.error(`[parse-om] stack: ${err.stack}`)
  } else {
    console.error(`[parse-om] ${label}:`, err)
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handleParseOM(req)
  } catch (err) {
    logErr('UNHANDLED top-level exception', err)
    return NextResponse.json({ error: 'parse_failed', detail: String(err) }, { status: 500 })
  }
}

async function handleParseOM(req: NextRequest): Promise<NextResponse> {
  console.log('[parse-om] request received')

  const anthropicKey = (process.env.ANTHROPIC_API_KEY ?? '').trim()
  console.log('[parse-om] ANTHROPIC_API_KEY present:', !!anthropicKey,
    '| length:', anthropicKey.length,
    '| prefix:', anthropicKey.slice(0, 7))
  if (!anthropicKey) {
    console.error('[parse-om] ANTHROPIC_API_KEY not set or empty')
    return NextResponse.json({ error: 'api_key_missing' }, { status: 503 })
  }

  // ── Parse JSON body: { storagePath, bucket? } ─────────────────────────────
  let body: { storagePath?: string; bucket?: string }
  try {
    body = await req.json()
    console.log('[parse-om] body:', body)
  } catch (err) {
    logErr('req.json() failed', err)
    return NextResponse.json({ error: 'bad_request', detail: 'Expected JSON body with storagePath' }, { status: 400 })
  }

  const { storagePath, bucket = 'deal-files' } = body
  if (!storagePath) {
    console.error('[parse-om] storagePath missing from body')
    return NextResponse.json({ error: 'bad_request', detail: 'storagePath is required' }, { status: 400 })
  }
  console.log('[parse-om] storagePath:', storagePath, 'bucket:', bucket)

  // ── Download file from Supabase Storage ───────────────────────────────────
  let buffer: Buffer
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.storage.from(bucket).download(storagePath)
    if (error) throw error
    const bytes = await data.arrayBuffer()
    buffer = Buffer.from(bytes)
    console.log('[parse-om] downloaded from storage, bytes:', buffer.length)
  } catch (err) {
    logErr('storage download failed', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'storage_error', detail }, { status: 500 })
  }

  const client = new Anthropic({ apiKey: anthropicKey })

  // ── Path 1: text-based PDF ────────────────────────────────────────────────
  let text = ''
  try {
    console.log('[parse-om] attempting pdf-parse text extraction...')
    const mod = await import('pdf-parse')
    console.log('[parse-om] pdf-parse module loaded, exports:', Object.keys(mod))
    const PDFParse = mod.PDFParse ?? (mod as any).default?.PDFParse
    if (!PDFParse) throw new Error('PDFParse class not found in module exports')
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    text = result.text ?? ''
    console.log('[parse-om] text extraction succeeded, chars:', text.length)
  } catch (err) {
    logErr('pdf-parse text extraction failed — will try vision fallback', err)
  }

  if (text.trim().length >= 100) {
    console.log('[parse-om] using text path, trimmed length:', text.trim().length)
    const truncatedText = text.slice(0, 15000)
    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `${EXTRACTION_PROMPT}\n\nOffering Memorandum Text:\n${truncatedText}`,
          },
        ],
      })
      console.log('[parse-om] text path stop_reason:', message.stop_reason)
      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
      console.log('[parse-om] text path response (first 200):', responseText.slice(0, 200))
      const parsed = extractJSON(responseText)
      if (parsed) {
        console.log('[parse-om] text path success')
        return NextResponse.json({ data: parsed })
      }
      console.warn('[parse-om] text path: extractJSON null, falling through to vision')
    } catch (err) {
      logErr('text path Claude call failed — falling through to vision', err)
    }
  } else {
    console.log('[parse-om] text too short/empty (length:', text.trim().length, '), skipping text path')
  }

  // ── Path 2: vision fallback for scanned / image-based PDFs ───────────────
  console.log('[parse-om] entering vision path, buffer size:', buffer.length)

  if (buffer.length > MAX_VISION_BYTES) {
    console.error('[parse-om] PDF too large for vision:', buffer.length, '>', MAX_VISION_BYTES)
    return NextResponse.json({ error: 'pdf_too_large' }, { status: 413 })
  }

  try {
    const base64 = buffer.toString('base64')
    console.log('[parse-om] base64 length:', base64.length)

    const docBlock: Anthropic.Beta.Messages.BetaRequestDocumentBlock = {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
    }
    const textBlock: Anthropic.Beta.Messages.BetaTextBlockParam = {
      type: 'text',
      text: EXTRACTION_PROMPT,
    }

    const message = await client.beta.messages.create(
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: [docBlock, textBlock] }],
      },
      { headers: { 'anthropic-beta': 'pdfs-2024-09-25' } },
    )

    console.log('[parse-om] vision path stop_reason:', message.stop_reason)
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log('[parse-om] vision path response (first 200):', responseText.slice(0, 200))
    const parsed = extractJSON(responseText)
    if (parsed) {
      console.log('[parse-om] vision path success')
      return NextResponse.json({ data: parsed, via: 'vision' })
    }

    console.warn('[parse-om] vision path: extractJSON null')
    return NextResponse.json({ error: 'parse_failed' }, { status: 500 })
  } catch (err) {
    logErr('vision path Claude call failed', err)
    return NextResponse.json({ error: 'parse_failed', detail: String(err) }, { status: 500 })
  }
}
