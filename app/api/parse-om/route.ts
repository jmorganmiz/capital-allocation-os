import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  let text = ''
  try {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    text = result.text
  } catch (err) {
    console.error('[parse-om] pdf-parse failed:', err)
    return NextResponse.json({ error: 'image_based_pdf' }, { status: 422 })
  }

  if (!text || text.trim().length < 100) {
    console.error('[parse-om] extracted text too short, likely scanned PDF. Length:', text?.trim().length ?? 0)
    return NextResponse.json({ error: 'image_based_pdf' }, { status: 422 })
  }

  const truncatedText = text.slice(0, 15000)

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'api_key_missing', message: 'ANTHROPIC_API_KEY is not configured' },
      { status: 503 }
    )
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a real estate data extraction assistant. Extract key deal data from the following offering memorandum text and respond with ONLY a valid JSON object using exactly these keys:

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

Return null for any field not found. Return ONLY the JSON object, no explanation or markdown fences.

Offering Memorandum Text:
${truncatedText}`,
        },
      ],
    })

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract the first {...} block — handles markdown fences, preamble, or bare JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'parse_failed' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({ data: parsed })
  } catch (err) {
    console.error('[parse-om] Claude API or JSON parse failed:', err)
    return NextResponse.json({ error: 'parse_failed' }, { status: 500 })
  }
}
