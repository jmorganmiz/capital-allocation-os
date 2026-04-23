'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type SchemaField =
  | 'title' | 'stage_id' | 'market' | 'deal_type' | 'source_type'
  | 'source_name' | 'asking_price' | 'property_size' | 'address'
  | 'deal_structure' | 'financing_type'

type ColMapping = {
  csv_column: string
  schema_field: SchemaField | null
  confidence: 'high' | 'medium' | 'low'
}

type Stage = { id: string; name: string }

type WizardStep = 'analyzing' | 'mapping' | 'preview' | 'import'

// ─── Hardcoded sample data (mirrors /public/test-import.csv) ─────────────────

const DEMO_STAGES: Stage[] = [
  { id: 'stage-new',           name: 'New' },
  { id: 'stage-screening',     name: 'Screening' },
  { id: 'stage-loi',           name: 'LOI' },
  { id: 'stage-due-diligence', name: 'Due Diligence' },
  { id: 'stage-closed',        name: 'Closed' },
]

const DEMO_MEMBERS = [
  { id: 'user-1', full_name: 'Alex Johnson' },
  { id: 'user-2', full_name: 'Sarah Kim' },
]

type CsvRow = Record<string, string>

const DEMO_ROWS: CsvRow[] = [
  { 'Deal Name': 'The Oaks at Cedar Park', 'Location': 'Cedar Park TX', 'Asking Price': '18500000', 'Asset Type': 'Multifamily', 'Size (SF)': '148000', 'Stage': 'Screening',        'Source': 'Broker',     'Structure': 'Acquisition',  'Financing': 'Agency'       },
  { 'Deal Name': 'Uptown Dallas Flats',    'Location': 'Dallas TX',      'Asking Price': '24750000', 'Asset Type': 'Multifamily', 'Size (SF)': '191500', 'Stage': 'Active DD',       'Source': 'LoopNet',    'Structure': 'Acquisition',  'Financing': 'Bridge'       },
  { 'Deal Name': 'Westchase Office Tower', 'Location': 'Houston TX',     'Asking Price': '12200000', 'Asset Type': 'Office',      'Size (SF)': '85000',  'Stage': 'Under Contract',  'Source': 'Direct',     'Structure': 'Acquisition',  'Financing': 'CMBS'         },
  { 'Deal Name': 'North SA Industrial',   'Location': 'San Antonio TX',  'Asking Price': '8500000',  'Asset Type': 'Industrial',  'Size (SF)': '120000', 'Stage': 'New Deal',        'Source': 'CoStar',     'Structure': 'Acquisition',  'Financing': 'Conventional' },
  { 'Deal Name': 'Panther Island Apts',   'Location': 'Fort Worth TX',   'Asking Price': '31000000', 'Asset Type': 'Multifamily', 'Size (SF)': '246000', 'Stage': 'LOI',             'Source': 'Broker',     'Structure': 'Joint Venture','Financing': 'Agency'       },
  { 'Deal Name': 'Domain Retail Center',  'Location': 'Austin TX',       'Asking Price': '6200000',  'Asset Type': 'Retail',      'Size (SF)': '28500',  'Stage': 'Initial Screening','Source': 'Off-Market', 'Structure': 'Acquisition',  'Financing': 'Conventional' },
  { 'Deal Name': 'Midtown Houston Lofts', 'Location': 'Houston TX',      'Asking Price': '45000000', 'Asset Type': 'Multifamily', 'Size (SF)': '318000', 'Stage': 'Due Diligence',   'Source': 'Broker',     'Structure': 'Acquisition',  'Financing': 'Bridge'       },
]

// Pre-computed as if Claude just ran the map-columns API
const INITIAL_MAPPINGS: ColMapping[] = [
  { csv_column: 'Deal Name',    schema_field: 'title',          confidence: 'high'   },
  { csv_column: 'Location',     schema_field: 'market',         confidence: 'high'   },
  { csv_column: 'Asking Price', schema_field: 'asking_price',   confidence: 'high'   },
  { csv_column: 'Asset Type',   schema_field: 'deal_type',      confidence: 'high'   },
  { csv_column: 'Size (SF)',    schema_field: 'property_size',  confidence: 'high'   },
  { csv_column: 'Stage',        schema_field: 'stage_id',       confidence: 'high'   },
  { csv_column: 'Source',       schema_field: 'source_type',    confidence: 'medium' },
  { csv_column: 'Structure',    schema_field: 'deal_structure', confidence: 'high'   },
  { csv_column: 'Financing',    schema_field: 'financing_type', confidence: 'high'   },
]

// Fuzzy-matched ahead of time using the same logic as the real MappingStep
const INITIAL_STAGE_RESOLUTIONS: Record<string, string | null> = {
  'Screening':        'stage-screening',
  'Active DD':        'stage-due-diligence',
  'Under Contract':   null,
  'New Deal':         'stage-new',
  'LOI':              'stage-loi',
  'Initial Screening':'stage-screening',
  'Due Diligence':    'stage-due-diligence',
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCHEMA_FIELDS: SchemaField[] = [
  'title', 'stage_id', 'market', 'deal_type', 'source_type',
  'source_name', 'asking_price', 'property_size', 'address',
  'deal_structure', 'financing_type',
]

const FIELD_LABELS: Record<SchemaField, string> = {
  title:          'Deal Title',
  stage_id:       'Pipeline Stage',
  market:         'Market',
  deal_type:      'Deal Type',
  source_type:    'Source Type',
  source_name:    'Source Name',
  asking_price:   'Asking Price',
  property_size:  'Property Size',
  address:        'Address',
  deal_structure: 'Deal Structure',
  financing_type: 'Financing Type',
}

const CONFIDENCE_CLASSES: Record<ColMapping['confidence'], string> = {
  high:   'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-orange-100 text-orange-700',
}

const STEP_ORDER: Record<WizardStep, number> = {
  analyzing: 1, mapping: 1, preview: 2, import: 3,
}

const STEP_LABELS = ['Upload', 'Map Columns', 'Preview', 'Import']

// ─── Main component ───────────────────────────────────────────────────────────

export default function DemoImportWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<WizardStep>('analyzing')
  const [mappings, setMappings] = useState<ColMapping[]>(INITIAL_MAPPINGS)
  const [stageResolutions, setStageResolutions] = useState(INITIAL_STAGE_RESOLUTIONS)
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null)

  // Simulate the AI mapping call finishing
  useEffect(() => {
    if (step !== 'analyzing') return
    const t = setTimeout(() => setStep('mapping'), 1800)
    return () => clearTimeout(t)
  }, [step])

  const stageColumn = mappings.find(m => m.schema_field === 'stage_id')?.csv_column ?? null

  const csvStageValues = stageColumn
    ? [...new Set(DEMO_ROWS.map(r => r[stageColumn]?.trim()).filter(Boolean))].sort()
    : []

  const handleFieldChange = useCallback((csvCol: string, field: SchemaField | null) => {
    setMappings(prev =>
      prev.map(m => m.csv_column === csvCol ? { ...m, schema_field: field, confidence: 'high' } : m)
    )
  }, [])

  const currentIdx = STEP_ORDER[step]
  const titleMapped = mappings.some(m => m.schema_field === 'title')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          {/* Step indicator */}
          <nav className="flex items-center">
            {STEP_LABELS.map((label, idx) => {
              const done   = idx < currentIdx || (idx === 0)
              const active = idx === currentIdx && step !== 'analyzing'
              const loading = idx === 1 && step === 'analyzing'
              return (
                <div key={label} className="flex items-center">
                  {idx > 0 && (
                    <div className={`h-px w-8 ${done ? 'bg-blue-400' : 'bg-gray-200'}`} />
                  )}
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${
                    active  ? 'text-blue-600'  :
                    loading ? 'text-blue-400'  :
                    done    ? 'text-gray-500'  : 'text-gray-400'
                  }`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                      active  ? 'bg-blue-600 text-white'  :
                      loading ? 'bg-blue-100 text-blue-500' :
                      done    ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {loading ? <SpinnerTiny /> : done ? '✓' : idx + 1}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                </div>
              )
            })}
          </nav>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-6">
          {step === 'analyzing' && <AnalyzingView />}
          {step === 'mapping'   && (
            <MappingView
              mappings={mappings}
              stageColumn={stageColumn}
              csvStageValues={csvStageValues}
              stageResolutions={stageResolutions}
              ownerUserId={ownerUserId}
              titleMapped={titleMapped}
              onFieldChange={handleFieldChange}
              onStageResolution={(v, id) => setStageResolutions(p => ({ ...p, [v]: id }))}
              onOwnerChange={setOwnerUserId}
              onContinue={() => setStep('preview')}
            />
          )}
          {step === 'preview' && (
            <PreviewView
              mappings={mappings}
              stageResolutions={stageResolutions}
              ownerUserId={ownerUserId}
              onBack={() => setStep('mapping')}
              onImport={() => setStep('import')}
            />
          )}
          {step === 'import' && <ImportView onClose={onClose} />}
        </div>
      </div>
    </div>
  )
}

// ─── Step views ───────────────────────────────────────────────────────────────

function AnalyzingView() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <svg className="h-7 w-7 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <div>
        <p className="text-sm font-medium text-gray-700">Analyzing columns with AI…</p>
        <p className="text-xs text-gray-400 mt-1">Matching your CSV headers to the deal schema</p>
      </div>
    </div>
  )
}

function MappingView({
  mappings,
  stageColumn,
  csvStageValues,
  stageResolutions,
  ownerUserId,
  titleMapped,
  onFieldChange,
  onStageResolution,
  onOwnerChange,
  onContinue,
}: {
  mappings: ColMapping[]
  stageColumn: string | null
  csvStageValues: string[]
  stageResolutions: Record<string, string | null>
  ownerUserId: string | null
  titleMapped: boolean
  onFieldChange: (col: string, field: SchemaField | null) => void
  onStageResolution: (v: string, id: string | null) => void
  onOwnerChange: (id: string | null) => void
  onContinue: () => void
}) {
  return (
    <div className="flex flex-col gap-7">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Map your columns</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review the AI suggestions and adjust as needed. Only{' '}
          <span className="font-medium">Deal Title</span> is required.
        </p>
      </div>

      {/* Column mapping table */}
      <section>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['CSV Column', 'Maps To', 'Confidence'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {mappings.map(m => (
                <tr key={m.csv_column}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{m.csv_column}</td>
                  <td className="px-4 py-3">
                    <select
                      value={m.schema_field ?? ''}
                      onChange={e => onFieldChange(m.csv_column, (e.target.value as SchemaField) || null)}
                      className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                    >
                      <option value="">(not mapped)</option>
                      {SCHEMA_FIELDS.map(f => (
                        <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {m.schema_field ? (
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_CLASSES[m.confidence]}`}>
                        {m.confidence}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!titleMapped && (
          <p className="mt-2 text-sm text-red-600">Deal Title must be mapped before you can continue.</p>
        )}
      </section>

      {/* Stage resolution */}
      {stageColumn && csvStageValues.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700">Stage values in your CSV</h3>
          <p className="mt-1 mb-3 text-xs text-gray-500">
            Found in the <span className="font-medium">"{stageColumn}"</span> column. Confirm which pipeline stage each should map to.
          </p>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Your value', 'Pipeline stage'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {csvStageValues.map(v => (
                  <tr key={v}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">"{v}"</td>
                    <td className="px-4 py-3">
                      <select
                        value={stageResolutions[v] ?? ''}
                        onChange={e => onStageResolution(v, e.target.value || null)}
                        className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                      >
                        <option value="">(skip — no stage)</option>
                        {DEMO_STAGES.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Owner */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700">Deal owner</h3>
        <p className="mt-1 mb-3 text-xs text-gray-500">Optionally assign all imported deals to a team member.</p>
        <select
          value={ownerUserId ?? ''}
          onChange={e => onOwnerChange(e.target.value || null)}
          className="w-56 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">No owner</option>
          {DEMO_MEMBERS.map(m => (
            <option key={m.id} value={m.id}>{m.full_name}</option>
          ))}
        </select>
      </section>

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <span />
        <button
          onClick={onContinue}
          disabled={!titleMapped}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}

function PreviewView({
  mappings,
  stageResolutions,
  ownerUserId,
  onBack,
  onImport,
}: {
  mappings: ColMapping[]
  stageResolutions: Record<string, string | null>
  ownerUserId: string | null
  onBack: () => void
  onImport: () => void
}) {
  const mappedFields = mappings
    .filter(m => m.schema_field !== null)
    .map(m => m.schema_field as SchemaField)

  const ownerName = DEMO_MEMBERS.find(m => m.id === ownerUserId)?.full_name ?? null

  function cellValue(row: CsvRow, field: SchemaField): string {
    const m = mappings.find(x => x.schema_field === field)
    if (!m) return ''
    const raw = row[m.csv_column]?.trim() ?? ''
    if (!raw) return ''
    if (field === 'stage_id') {
      const stageId = stageResolutions[raw]
      return stageId ? (DEMO_STAGES.find(s => s.id === stageId)?.name ?? raw) : '—'
    }
    return raw
  }

  const importableCount = DEMO_ROWS.filter(r => {
    const titleCol = mappings.find(m => m.schema_field === 'title')?.csv_column
    return titleCol && r[titleCol]?.trim()
  }).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Preview import</h2>
        <p className="mt-1 text-sm text-gray-500">
          Showing all {DEMO_ROWS.length} rows with your column mappings applied.
        </p>
      </div>

      <div className="flex gap-3">
        <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          {importableCount} will import
        </span>
        {ownerName && (
          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            Owner: {ownerName}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {mappedFields.map(f => (
                <th key={f} className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  {FIELD_LABELS[f]}
                </th>
              ))}
              {ownerName && (
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Owner</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {DEMO_ROWS.map((row, i) => (
              <tr key={i}>
                {mappedFields.map(f => (
                  <td key={f} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {cellValue(row, f) || <span className="text-gray-300">—</span>}
                  </td>
                ))}
                {ownerName && (
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{ownerName}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <button
          onClick={onBack}
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
        <button
          onClick={onImport}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Import {importableCount} deals →
        </button>
      </div>
    </div>
  )
}

function ImportView({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
        🔒
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Sign up to import your deals</h2>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          Connect your own pipeline, import historical deals in one click, and keep everything in sync — no spreadsheets needed.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Keep exploring
        </button>
        <Link
          href="/signup"
          className="rounded-md bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Sign up free →
        </Link>
      </div>
    </div>
  )
}

// ─── Tiny inline spinner for step indicator ───────────────────────────────────

function SpinnerTiny() {
  return (
    <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
