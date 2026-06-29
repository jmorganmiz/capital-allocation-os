import Anthropic from '@anthropic-ai/sdk'

// Max PDF size for the vision fallback path (Anthropic's hard limit is ~32 MB raw;
// files above MAX_VISION_BYTES skip vision and return pdf_too_large).
const MAX_VISION_BYTES = 50 * 1024 * 1024
const CLAUDE_MODEL = 'claude-sonnet-4-6'

export type ParsedOMData = {
  address: string | null
  asking_price: number | null
  noi: number | null
  cap_rate: number | null
  irr: number | null
  debt_service: number | null
  property_type: string | null
  square_footage: number | null
  year_built: number | null
  num_units: number | null
  occupancy_rate: number | null
  broker_name: string | null
  brokerage: string | null
  market: string | null
}

export type ParseOMResult =
  | { data: ParsedOMData; via?: 'vision' }
  | { error: 'api_key_missing' | 'pdf_too_large' | 'parse_failed'; detail?: string }

const EXTRACTION_PROMPT = `You are a real estate data extraction assistant. Extract key deal data from the following offering memorandum and respond with ONLY a valid JSON object using exactly these keys:

- address (string): Full property address
- asking_price (number): Asking/list price in dollars, digits only, no formatting
- noi (number): Net Operating Income in dollars — look for "Net Operating Income", "NOI", "Stabilized NOI", "Year 1 NOI", "T-12 NOI". Digits only, no formatting.
- cap_rate (number): Cap rate as a decimal (e.g. 0.065 for 6.5%). Look for "Cap Rate", "Going-In Cap Rate", "Stabilized Cap Rate". If expressed as a percentage like "6.50%" convert to 0.065.
- irr (number): Projected Internal Rate of Return as a decimal (e.g. 0.18 for 18%). Look for "IRR", "Projected IRR", "Levered IRR", "Unlevered IRR" in any returns analysis or pro forma section. null if not shown.
- debt_service (number): Annual debt service in dollars if explicitly shown in a sources & uses table or cash flow summary. Digits only, null if not shown.
- property_type (string): One of: multifamily, retail, office, industrial, hospitality, self_storage, mixed_use, land, other
- square_footage (number): Total square footage (GLA, GBA, or NRA), digits only
- year_built (number): Four-digit year the property was built
- num_units (number): Number of units for multifamily/self-storage, null otherwise
- occupancy_rate (number): Current or in-place occupancy as decimal (e.g. 0.95 for 95%). Look for "Occupancy", "Leased %", "Physical Occupancy".
- broker_name (string): Broker's full name
- brokerage (string): Brokerage firm name
- market (string): City and state (e.g. "Austin, TX")

Return null for any field not found. Return ONLY the JSON object, no explanation or markdown fences.`

function extractJSON(text: string): ParsedOMData | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0]) as ParsedOMData
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

/**
 * Parse a PDF buffer through Claude (text path first, vision fallback).
 * Used by both /api/parse-om (which downloads from storage first) and the
 * email inbox webhook (which has the buffer from the email attachment).
 */
export async function parseOMBuffer(buffer: Buffer): Promise<ParseOMResult> {
  const anthropicKey = (process.env.ANTHROPIC_API_KEY ?? '').trim()
  if (!anthropicKey) {
    console.error('[parse-om] ANTHROPIC_API_KEY not set or empty')
    return { error: 'api_key_missing' }
  }

  console.log('[parse-om] buffer size:', buffer.length)
  const client = new Anthropic({ apiKey: anthropicKey })

  // ── Path 1: text-based PDF ────────────────────────────────────────────────
  let text = ''
  try {
    console.log('[parse-om] attempting pdf-parse text extraction...')
    const canvas = await import('@napi-rs/canvas')
    if (!globalThis.DOMMatrix) globalThis.DOMMatrix = canvas.DOMMatrix as typeof globalThis.DOMMatrix
    if (!globalThis.ImageData) globalThis.ImageData = canvas.ImageData as typeof globalThis.ImageData
    if (!globalThis.Path2D) globalThis.Path2D = canvas.Path2D as typeof globalThis.Path2D
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
        model: CLAUDE_MODEL,
        max_tokens: 1536,
        messages: [
          {
            role: 'user',
            content: `${EXTRACTION_PROMPT}\n\nOffering Memorandum Text:\n${truncatedText}`,
          },
        ],
      })
      console.log('[parse-om] text path stop_reason:', message.stop_reason)
      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
      const parsed = extractJSON(responseText)
      if (parsed) {
        console.log('[parse-om] text path success')
        return { data: parsed }
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
    return { error: 'pdf_too_large' }
  }

  try {
    const base64 = buffer.toString('base64')
    console.log('[parse-om] base64 length:', base64.length)

    const docBlock: Anthropic.Messages.DocumentBlockParam = {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
    }
    const textBlock: Anthropic.Messages.TextBlockParam = {
      type: 'text',
      text: EXTRACTION_PROMPT,
    }

    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1536,
      messages: [{ role: 'user', content: [docBlock, textBlock] }],
    })

    console.log('[parse-om] vision path stop_reason:', message.stop_reason)
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = extractJSON(responseText)
    if (parsed) {
      console.log('[parse-om] vision path success')
      return { data: parsed, via: 'vision' }
    }

    console.warn('[parse-om] vision path: extractJSON null')
    return { error: 'parse_failed' }
  } catch (err) {
    logErr('vision path Claude call failed', err)
    return { error: 'parse_failed', detail: String(err) }
  }
}
