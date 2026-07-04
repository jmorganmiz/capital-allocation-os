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
  fixedOperatingExpenses: { label: 'Other operating expenses', category: 'operations', unit: '$/year' },
  ltv: { label: 'Loan-to-value', category: 'debt', unit: '%' },
  interestRate: { label: 'Interest rate', category: 'debt', unit: '%' },
  amortizationYears: { label: 'Amortization', category: 'debt', unit: 'years' },
  interestOnlyMonths: { label: 'Interest-only period', category: 'debt', unit: 'months' },
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

export type UnderwritingDocumentType = 'offering_memorandum' | 'rent_roll' | 't12' | 'debt_quote' | 'other'

type RawFact = { key?: string; value?: unknown; confidence?: unknown; evidence_quote?: unknown; page?: unknown }
type RawConflict = { key?: string; values?: unknown[]; reason?: unknown }
type RawExtraction = { document_type?: string; asset_type?: string; facts?: RawFact[]; conflicts?: RawConflict[] }

const PROMPT = `Classify this document as exactly one of: offering_memorandum, rent_roll, t12, debt_quote, other.
Classify the asset as exactly one of: multifamily, retail, office, industrial, hospitality, self_storage, mixed_use, land, other, unknown.
Then extract only explicitly stated multifamily underwriting facts.
Return one JSON object with "document_type", "asset_type", "conflicts", and "facts". Each fact must contain:
key, value, confidence, evidence_quote, page.

If the asset_type is not multifamily, return an empty facts array.
If a field has multiple materially different values and the document does not clearly identify which one is current, omit it from facts and add { key, values, reason } to conflicts.

Allowed keys only:
- purchasePrice: dollars
- totalUnits: integer units
- currentRent: average monthly in-place rent per unit
- marketRent: average monthly market rent per unit
- vacancyPct: decimal vacancy (derive from explicitly stated occupancy only when necessary)
- renovationCostPerUnit: dollars per unit
- propertyTaxes: annual dollars
- insurance: annual dollars
- fixedOperatingExpenses: annual operating expenses excluding property taxes, insurance, management fees, and replacement reserves
- ltv: decimal loan-to-value
- interestRate: decimal annual interest rate
- amortizationYears: years
- interestOnlyMonths: months

Rules:
- Never estimate or infer a missing value.
- Cite the exact supporting document text for every fact using the document citation system.
- Normalize percentages to decimals.
- If several values exist, use the current/in-place or trailing value and make the quote identify it.
- For purchasePrice, do not choose between conflicting asking prices; report a conflict.
- currentRent and marketRent must be explicitly labeled monthly per-unit averages. Never divide a rent total by units.
- fixedOperatingExpenses may be extracted only when the document explicitly states the relevant total excluding property taxes, insurance, management fees, and replacement reserves. Never calculate it from line items and never use total operating expenses.
- Omit unsupported facts.
- Output valid JSON only.`

function extractJson(text: string): RawExtraction | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) as RawExtraction } catch { return null }
}

function isValidValue(key: FieldKey, value: number) {
  if (!Number.isFinite(value)) return false
  if (key === 'vacancyPct' || key === 'ltv' || key === 'interestRate') return value >= 0 && value <= 1
  if (key === 'totalUnits') return Number.isInteger(value) && value > 0 && value <= 100_000
  if (key === 'amortizationYears') return Number.isInteger(value) && value >= 1 && value <= 50
  if (key === 'interestOnlyMonths') return Number.isInteger(value) && value >= 0 && value <= 600
  return value >= 0 && value <= 1_000_000_000
}

function materiallyDifferent(a: number, b: number) {
  return Math.abs(a - b) > Math.max(0.001, Math.max(Math.abs(a), Math.abs(b)) * 0.001)
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
  const warnings: string[] = []
  const documentTypes: UnderwritingDocumentType[] = ['offering_memorandum', 'rent_roll', 't12', 'debt_quote', 'other']
  const documentType = documentTypes.includes(parsed.document_type as UnderwritingDocumentType)
    ? parsed.document_type as UnderwritingDocumentType
    : 'other'
  const assetType = typeof parsed.asset_type === 'string' ? parsed.asset_type : 'unknown'

  if (assetType !== 'multifamily') {
    warnings.push(`Document classified as ${assetType}; multifamily underwriting facts were suppressed.`)
  }
  for (const conflict of parsed.conflicts ?? []) {
    if (!conflict.key || !(conflict.key in FIELD_DEFINITIONS)) continue
    warnings.push(`Conflicting ${conflict.key} values were suppressed${typeof conflict.reason === 'string' && conflict.reason.trim() ? `: ${conflict.reason.trim()}` : '.'}`)
  }

  const candidates = (assetType === 'multifamily' ? parsed.facts : []).flatMap((raw): ExtractedUnderwritingFact[] => {
    if (!raw.key || !(raw.key in FIELD_DEFINITIONS)) return []
    const key = raw.key as FieldKey
    const value = Number(raw.value)
    if (!isValidValue(key, value)) {
      warnings.push(`Invalid ${key} value was suppressed.`)
      return []
    }
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
    if (!citation) {
      warnings.push(`Uncited ${key} value was suppressed.`)
      return []
    }
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

  const grouped = new Map<FieldKey, ExtractedUnderwritingFact[]>()
  for (const fact of candidates) grouped.set(fact.key, [...(grouped.get(fact.key) ?? []), fact])
  const facts: ExtractedUnderwritingFact[] = []
  for (const [key, values] of grouped) {
    if (values.some((fact) => materiallyDifferent(values[0].value, fact.value))) {
      warnings.push(`Multiple materially different ${key} values were suppressed.`)
      continue
    }
    facts.push(values.sort((a, b) => b.confidence - a.confidence)[0])
  }

  return {
    facts,
    documentType,
    assetType,
    warnings: [...new Set(warnings)],
    provider: 'anthropic',
    model: MODEL,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  }
}
