import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

// Max PDF size we'll send to the vision API (20 MB)
const MAX_VISION_BYTES = 20 * 1024 * 1024

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

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'api_key_missing', message: 'ANTHROPIC_API_KEY is not configured' },
      { status: 503 }
    )
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // ── Path 1: text-based PDF ────────────────────────────────────────────────
  let text = ''
  try {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    text = result.text ?? ''
  } catch (err) {
    console.warn('[parse-om] pdf-parse failed, will try vision fallback:', err)
  }

  if (text.trim().length >= 100) {
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

      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
      const parsed = extractJSON(responseText)
      if (parsed) return NextResponse.json({ data: parsed })

      console.warn('[parse-om] text path: could not parse JSON from response')
    } catch (err) {
      console.error('[parse-om] text path Claude call failed:', err)
    }
  }

  // ── Path 2: vision fallback for scanned / image-based PDFs ───────────────
  console.log('[parse-om] falling back to PDF vision, file size:', buffer.length, 'bytes')

  if (buffer.length > MAX_VISION_BYTES) {
    console.error('[parse-om] PDF too large for vision fallback:', buffer.length, 'bytes')
    return NextResponse.json({ error: 'pdf_too_large' }, { status: 413 })
  }

  try {
    const base64 = buffer.toString('base64')
    const message = await client.beta.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      betas: ['pdfs-2024-09-25'],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = extractJSON(responseText)
    if (parsed) return NextResponse.json({ data: parsed, via: 'vision' })

    console.warn('[parse-om] vision path: could not parse JSON from response')
    return NextResponse.json({ error: 'parse_failed' }, { status: 500 })
  } catch (err) {
    console.error('[parse-om] vision path Claude call failed:', err)
    return NextResponse.json({ error: 'parse_failed' }, { status: 500 })
  }
}
