'use client'

import { useCallback, useState } from 'react'
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
type CsvRow = Record<string, string>

type WizardStep = 'mapping' | 'preview' | 'import'

// ─── Hardcoded sample data ─────────────────────────────────────────────────────

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

const DEMO_ROWS: CsvRow[] = [
  { 'Deal Name': 'The Oaks at Cedar Park', 'Location': 'Cedar Park TX', 'Asking Price': '18500000', 'Asset Type': 'Multifamily', 'Size SF': '148000', 'Stage': 'Screening',         'Broker': 'Transwestern'        },
  { 'Deal Name': 'Uptown Dallas Flats',    'Location': 'Dallas TX',      'Asking Price': '24750000', 'Asset Type': 'Multifamily', 'Size SF': '191500', 'Stage': 'Active DD',        'Broker': 'CBRE'                 },
  { 'Deal Name': 'Westchase Office Tower', 'Location': 'Houston TX',     'Asking Price': '12200000', 'Asset Type': 'Office',      'Size SF': '85000',  'Stage': 'Under Contract',   'Broker': 'JLL'                  },
  { 'Deal Name': 'North SA Industrial',    'Location': 'San Antonio TX',  'Asking Price': '8500000',  'Asset Type': 'Industrial',  'Size SF': '120000', 'Stage': 'New Deal',         'Broker': 'Marcus & Millichap'   },
  { 'Deal Name': 'Panther Island Apts',    'Location': 'Fort Worth TX',   'Asking Price': '31000000', 'Asset Type': 'Multifamily', 'Size SF': '246000', 'Stage': 'LOI',              'Broker': 'Cushman & Wakefield'  },
  { 'Deal Name': 'Domain Retail Center',   'Location': 'Austin TX',       'Asking Price': '6200000',  'Asset Type': 'Retail',      'Size SF': '28500',  'Stage': 'Initial Screening','Broker': 'Newmark'              },
  { 'Deal Name': 'Midtown Houston Lofts',  'Location': 'Houston TX',      'Asking Price': '45000000', 'Asset Type': 'Multifamily', 'Size SF': '318000', 'Stage': 'Due Diligence',    'Broker': 'HFF'                  },
]

const INITIAL_MAPPINGS: ColMapping[] = [
  { csv_column: 'Deal Name',    schema_field: 'title',         confidence: 'high'   },
  { csv_column: 'Location',     schema_field: 'market',        confidence: 'high'   },
  { csv_column: 'Asking Price', schema_field: 'asking_price',  confidence: 'high'   },
  { csv_column: 'Asset Type',   schema_field: 'deal_type',     confidence: 'high'   },
  { csv_column: 'Size SF',      schema_field: 'property_size', confidence: 'medium' },
  { csv_column: 'Stage',        schema_field: 'stage_id',      confidence: 'high'   },
  { csv_column: 'Broker',       schema_field: 'source_name',   confidence: 'medium' },
]

const INITIAL_STAGE_RESOLUTIONS: Record<string, string | null> = {
  'Screening':         'stage-screening',
  'Active DD':         'stage-due-diligence',
  'Under Contract':    null,
  'New Deal':          'stage-new',
  'LOI':               'stage-loi',
  'Initial Screening': 'stage-screening',
  'Due Diligence':     'stage-due-diligence',
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

const STEP_LABELS = ['Upload', 'Map Columns', 'Preview', 'Import']
const STEP_ORDER: Record<WizardStep, number> = { mapping: 1, preview: 2, import: 3 }

// ─── Component ────────────────────────────────────────────────────────────────

export default function DemoImportWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<WizardStep>('mapping')
  const [mappings, setMappings] = useState<ColMapping[]>(INITIAL_MAPPINGS)
  const [stageResolutions, setStageResolutions] = useState(INITIAL_STAGE_RESOLUTIONS)
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null)

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
          <nav className="flex items-center">
            {STEP_LABELS.map((label, idx) => {
              const done   = idx === 0 || idx < currentIdx
              const active = idx === currentIdx
              return (
                <div key={label} className="flex items-center">
                  {idx > 0 && (
                    <div className={`h-px w-8 ${done ? 'bg-blue-400' : 'bg-gray-200'}`} />
                  )}
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${
                    active ? 'text-blue-600' : done ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                      active ? 'bg-blue-600 text-white'  :
                      done   ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {done && !active ? '✓' : idx + 1}
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
          {step === 'mapping' && (
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
          {step === 'import' && (
            <SuccessView onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Mapping step ─────────────────────────────────────────────────────────────

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
          AI mapped your CSV columns to the deal schema. Review and adjust as needed — only{' '}
          <span className="font-medium">Deal Title</span> is required.
        </p>
      </div>

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

      <div className="flex items-center justify-end border-t border-gray-100 pt-4">
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

// ─── Preview step ─────────────────────────────────────────────────────────────

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Preview import</h2>
        <p className="mt-1 text-sm text-gray-500">
          All {DEMO_ROWS.length} rows with your column mappings applied.
        </p>
      </div>

      <div className="flex gap-3">
        <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          {DEMO_ROWS.length} will import
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
          Import {DEMO_ROWS.length} deals →
        </button>
      </div>
    </div>
  )
}

// ─── Success step ─────────────────────────────────────────────────────────────

function SuccessView({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
        <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900">7 deals imported successfully</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-xs">
          Your Texas CRE deals have been added to the pipeline and sorted into their stages.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 pt-1">
        <button
          onClick={onClose}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          View pipeline →
        </button>
        <Link
          href="/signup"
          className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
        >
          Import your own deals — sign up free
        </Link>
      </div>
    </div>
  )
}
