import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic()

// ─── Schema ──────────────────────────────────────────────────────────────────

const SCHEMA_FIELDS = [
  'title',
  'stage_id',
  'owner_user_id',
  'market',
  'deal_type',
  'source_type',
  'source_name',
  'asking_price',
  'property_size',
  'address',
  'deal_structure',
  'financing_type',
] as const

type SchemaField = (typeof SCHEMA_FIELDS)[number]

const FIELD_DESCRIPTIONS: Record<SchemaField, string> = {
  title: 'Deal name or project name — the only required field for import',
  stage_id:
    'Pipeline stage name (e.g. "Initial Review", "LOI", "Under Contract") — will be resolved to an ID',
  owner_user_id:
    'Deal owner or assigned team member — map only if the column clearly represents ownership',
  market: 'Geographic market (e.g. "Austin", "Southeast", "NYC Metro")',
  deal_type: 'Property or deal type (e.g. "Multifamily", "Office", "Retail", "Industrial")',
  source_type: 'How the deal was sourced (e.g. "Broker", "Direct", "LoopNet")',
  source_name: 'Name of the source, such as a broker name or platform',
  asking_price: 'Listed or asking price in USD — numeric value',
  property_size: 'Property size such as square footage or unit count — numeric',
  address: 'Property street address',
  deal_structure: 'Deal structure type (e.g. "Acquisition", "Joint Venture", "Refinance")',
  financing_type: 'Financing type (e.g. "Conventional", "Bridge", "CMBS")',
}

// ─── Static prompt + tool (module-level to avoid re-allocation per request) ──

const SYSTEM_PROMPT = `You are a data mapping assistant for a real estate deal pipeline called Dealstash. \
Map CSV column names to the correct schema fields using both column names and sample data as signals.

Be conservative: if you are not confident, return null for schema_field or set confidence to "low". \
It is better to leave a column unmapped than to map it incorrectly.

Available schema fields:
${SCHEMA_FIELDS.map((f) => `- ${f}: ${FIELD_DESCRIPTIONS[f]}`).join('\n')}`

const MAP_COLUMNS_TOOL: Anthropic.Messages.Tool = {
  name: 'map_csv_columns',
  description:
    'Return the mapping of each CSV column to its corresponding deal schema field',
  input_schema: {
    type: 'object',
    properties: {
      mappings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            csv_column: {
              type: 'string',
              description: 'The original CSV column name exactly as it appears in the file',
            },
            schema_field: {
              anyOf: [
                { type: 'string', enum: [...SCHEMA_FIELDS] },
                { type: 'null' },
              ],
              description:
                'The matching schema field, or null if no confident match exists',
            },
            confidence: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'Confidence level for this mapping',
            },
          },
          required: ['csv_column', 'schema_field', 'confidence'],
        },
      },
    },
    required: ['mappings'],
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ColumnMapping = {
  csv_column: string
  schema_field: SchemaField | null
  confidence: 'high' | 'medium' | 'low'
}

export type MapColumnsResponse = {
  mappings: ColumnMapping[]
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { headers?: unknown; sampleRows?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { headers, sampleRows } = body

  if (!Array.isArray(headers) || headers.length === 0) {
    return NextResponse.json(
      { error: 'headers must be a non-empty array' },
      { status: 400 },
    )
  }

  if (!Array.isArray(sampleRows)) {
    return NextResponse.json(
      { error: 'sampleRows must be an array' },
      { status: 400 },
    )
  }

  const sampleData = (sampleRows as Record<string, string>[])
    .slice(0, 3)
    .map((row, i) => `Row ${i + 1}: ${JSON.stringify(row)}`)
    .join('\n')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Map these CSV columns to the deal schema.

Columns: ${JSON.stringify(headers)}

Sample data:
${sampleData || '(no sample rows provided)'}`,
        },
      ],
      tools: [MAP_COLUMNS_TOOL],
      tool_choice: { type: 'tool', name: 'map_csv_columns' },
    })

    const toolBlock = response.content.find((b) => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return NextResponse.json(
        { error: 'Unexpected response shape from AI' },
        { status: 500 },
      )
    }

    return NextResponse.json(toolBlock.input as MapColumnsResponse)
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic API error:', error.status, error.message)
      return NextResponse.json(
        { error: 'AI mapping service unavailable' },
        { status: 502 },
      )
    }
    throw error
  }
}
