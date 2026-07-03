import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-sonnet-4-6'
const MAX_BYTES = 32 * 1024 * 1024

const FIELD_DEFINITIONS = {
  purchasePrice: { label: 'Purchase price', category: 'basis', unit: '$' },
  totalUnits: { label: 'Total units', category: 'property', unit: 'units' },
  currentRent: { label: 'Average current rent', category: 'rent_roll', unit: '$/unit/month' },
  marketRent: { label: 'Average market rent', category: 'rent_roll', unit: '$/unit/month' },
  vacancyPct: { label: 'Vacancy', category: 'operations', unit: '%' },
  renovationCostPerUnit: { label: 'Renovation cost per unit', category: 'renovation', unit: '$/unit' },
  propertyTaxes: { label: 'Property taxes', category: 'operations', unit: '$/year' },
  insurance: { label: 'Insurance', category: 'operations', unit: '$/year' },
} as const

type FieldKey = keyof typeof FIELD_DEFINITIONS

export type ExtractedUnderwritingFact = {
  key: FieldKey
  label: string
  category: string
  value: number
  unit: string
  confidence: number
  excerpt: string
  locator: string | null
  citationVerified: boolean
}

type RawFact = { key?: string; value?: unknown; confidence?: unknown; evidence_quote?: unknown; page?: unknown }

const PROMPT = `Extract only explicitly stated multifamily underwriting facts from this document.
Return one JSON object with a "facts" array. Each fact must contain:
key, value, confidence, evidence_quote, page.

Allowed keys only:
- purchasePrice: dollars
- totalUnits: integer units
- currentRent: average monthly in-place rent per unit
- marketRent: average monthly market rent per unit
- vacancyPct: decimal vacancy (derive from explicitly stated occupancy only when necessary)
- renovationCostPerUnit: dollars per unit
- propertyTaxes: annual dollars
- insurance: annual dollars

Rules:
- Never estimate or infer a missing value.
- Cite the exact supporting document text for every fact using the document citation system.
- Normalize percentages to decimals.
- If several values exist, use the current/in-place or trailing value and make the quote identify it.
- Omit unsupported facts.
- Output valid JSON only.`

function extractJson(text: string): { facts?: RawFact[] } | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) as { facts?: RawFact[] } } catch { return null }
}

export async function extractUnderwritingFacts(buffer: Buffer, filename: string) {
  if (buffer.length > MAX_BYTES) throw new Error(`${filename} exceeds the 32 MB extraction limit.`)
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) throw new Error('Document extraction provider is not configured.')

  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') },
          title: filename,
          citations: { enabled: true },
        },
        { type: 'text', text: PROMPT },
      ],
    }],
  })
  const blocks = message.content.filter((block) => block.type === 'text')
  const parsed = extractJson(blocks.map((block) => block.text).join('\n'))
  if (!parsed?.facts) throw new Error(`No structured facts could be extracted from ${filename}.`)
  const citations = blocks.flatMap((block) => block.citations ?? [])

  const facts = parsed.facts.flatMap((raw): ExtractedUnderwritingFact[] => {
    if (!raw.key || !(raw.key in FIELD_DEFINITIONS)) return []
    const key = raw.key as FieldKey
    const value = Number(raw.value)
    if (!Number.isFinite(value)) return []
    const quote = typeof raw.evidence_quote === 'string' ? raw.evidence_quote.trim() : ''
    const requestedPage = Number(raw.page)
    const citation = citations.find((item) => {
      const citedText = 'cited_text' in item ? item.cited_text : ''
      const quoteMatch = quote.length >= 12 && citedText.toLowerCase().includes(quote.slice(0, 40).toLowerCase())
      const pageMatch = item.type === 'page_location' && Number.isFinite(requestedPage)
        && requestedPage >= item.start_page_number && requestedPage <= item.end_page_number
      return quoteMatch || pageMatch
    })
    const locator = citation?.type === 'page_location'
      ? citation.start_page_number === citation.end_page_number
        ? `Page ${citation.start_page_number}`
        : `Pages ${citation.start_page_number}-${citation.end_page_number}`
      : null
    const citedText = citation && 'cited_text' in citation ? citation.cited_text : quote
    const rawConfidence = Number(raw.confidence)
    const confidence = Math.max(0, Math.min(citation ? 0.95 : 0.45, Number.isFinite(rawConfidence) ? rawConfidence : 0.5))
    const definition = FIELD_DEFINITIONS[key]
    return [{
      key,
      label: definition.label,
      category: definition.category,
      value,
      unit: definition.unit,
      confidence,
      excerpt: citedText.slice(0, 800),
      locator,
      citationVerified: Boolean(citation),
    }]
  })

  return {
    facts,
    provider: 'anthropic',
    model: MODEL,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  }
}

