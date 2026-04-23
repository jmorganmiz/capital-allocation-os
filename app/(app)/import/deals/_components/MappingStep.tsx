'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { UploadResult } from './UploadStep'
import type { ColumnMapping } from '@/app/api/import/deals/map-columns/route'
import type { FirmDataResponse, FirmMember, FirmStage } from '@/app/api/import/deals/firm-data/route'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MappingResult = {
  columnMappings: ColumnMapping[]
  stageResolutions: Record<string, string | null>
  ownerUserId: string | null
}

type Props = {
  uploadResult: UploadResult
  onComplete: (result: MappingResult) => void
  onBack: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCHEMA_FIELDS = [
  'title',
  'stage_id',
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

const FIELD_LABELS: Record<SchemaField | 'owner_user_id', string> = {
  title: 'Deal Title',
  stage_id: 'Pipeline Stage',
  owner_user_id: 'Owner',
  market: 'Market',
  deal_type: 'Deal Type',
  source_type: 'Source Type',
  source_name: 'Source Name',
  asking_price: 'Asking Price',
  property_size: 'Property Size',
  address: 'Address',
  deal_structure: 'Deal Structure',
  financing_type: 'Financing Type',
}

const CONFIDENCE_CLASSES: Record<ColumnMapping['confidence'], string> = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-orange-100 text-orange-700',
}

// ─── Stage fuzzy match ────────────────────────────────────────────────────────

function norm(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
}

function fuzzyMatchStage(csvValue: string, stages: FirmStage[]): FirmStage | null {
  const v = norm(csvValue)
  if (!v) return null
  return (
    stages.find((s) => norm(s.name) === v) ??
    stages.find((s) => norm(s.name).includes(v) || v.includes(norm(s.name))) ??
    null
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MappingStep({ uploadResult, onComplete, onBack }: Props) {
  const { allRows, mappings: initialMappings } = uploadResult

  const [stages, setStages] = useState<FirmStage[]>([])
  const [members, setMembers] = useState<FirmMember[]>([])
  const [loadingFirmData, setLoadingFirmData] = useState(true)
  const [firmDataError, setFirmDataError] = useState<string | null>(null)

  // Editable column mappings — owner_user_id is always manual, so reset any AI guess
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>(() =>
    initialMappings.map((m) => ({
      ...m,
      schema_field: m.schema_field === 'owner_user_id' ? null : m.schema_field,
    })),
  )

  const [stageResolutions, setStageResolutions] = useState<Record<string, string | null>>({})
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/import/deals/firm-data')
      .then((res) => (res.ok ? (res.json() as Promise<FirmDataResponse>) : Promise.reject(res)))
      .then((data) => {
        setStages(data.stages)
        setMembers(data.members)
      })
      .catch(() => setFirmDataError('Could not load firm data. Please refresh and try again.'))
      .finally(() => setLoadingFirmData(false))
  }, [])

  const stageColumn = useMemo(
    () => columnMappings.find((m) => m.schema_field === 'stage_id')?.csv_column ?? null,
    [columnMappings],
  )

  const csvStageValues = useMemo(() => {
    if (!stageColumn) return []
    const seen = new Set<string>()
    for (const row of allRows) {
      const v = row[stageColumn]?.trim()
      if (v) seen.add(v)
    }
    return [...seen].sort()
  }, [stageColumn, allRows])

  // Re-run fuzzy match whenever stages load or the mapped stage column changes
  useEffect(() => {
    if (!stages.length || !csvStageValues.length) return
    setStageResolutions((prev) => {
      const next: Record<string, string | null> = {}
      for (const v of csvStageValues) {
        // Preserve manual overrides; auto-match only when the key is new
        next[v] = v in prev ? prev[v] : (fuzzyMatchStage(v, stages)?.id ?? null)
      }
      return next
    })
  }, [stages, csvStageValues])

  const handleFieldChange = useCallback(
    (csvColumn: string, newField: SchemaField | null) => {
      setColumnMappings((prev) =>
        prev.map((m) =>
          m.csv_column === csvColumn ? { ...m, schema_field: newField, confidence: 'high' } : m,
        ),
      )
    },
    [],
  )

  const handleStageResolution = useCallback((csvValue: string, stageId: string | null) => {
    setStageResolutions((prev) => ({ ...prev, [csvValue]: stageId }))
  }, [])

  const titleMapped = columnMappings.some((m) => m.schema_field === 'title')

  const handleSubmit = useCallback(() => {
    if (!titleMapped) return
    onComplete({ columnMappings, stageResolutions, ownerUserId })
  }, [titleMapped, columnMappings, stageResolutions, ownerUserId, onComplete])

  if (loadingFirmData) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-500">
        Loading…
      </div>
    )
  }

  if (firmDataError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {firmDataError}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
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
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  CSV Column
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Maps To
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {columnMappings.map((mapping) => (
                <MappingRow
                  key={mapping.csv_column}
                  mapping={mapping}
                  onFieldChange={handleFieldChange}
                />
              ))}
            </tbody>
          </table>
        </div>
        {!titleMapped && (
          <p className="mt-2 text-sm text-red-600">
            Deal Title must be mapped before you can continue.
          </p>
        )}
      </section>

      {/* Stage value resolution */}
      {stageColumn && csvStageValues.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700">Stage values in your CSV</h3>
          <p className="mt-1 mb-3 text-xs text-gray-500">
            Found in the <span className="font-medium">"{stageColumn}"</span> column. Confirm which
            pipeline stage each should map to, or leave blank to skip.
          </p>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Your value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Pipeline stage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {csvStageValues.map((value) => (
                  <StageResolutionRow
                    key={value}
                    csvValue={value}
                    stageId={stageResolutions[value] ?? null}
                    stages={stages}
                    onChange={handleStageResolution}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Owner assignment */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700">Deal owner</h3>
        <p className="mt-1 mb-3 text-xs text-gray-500">
          Optionally assign all imported deals to a team member.
        </p>
        <select
          value={ownerUserId ?? ''}
          onChange={(e) => setOwnerUserId(e.target.value || null)}
          className="w-64 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">No owner</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name ?? m.email}
            </option>
          ))}
        </select>
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!titleMapped}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MappingRow({
  mapping,
  onFieldChange,
}: {
  mapping: ColumnMapping
  onFieldChange: (csvColumn: string, field: SchemaField | null) => void
}) {
  return (
    <tr>
      <td className="px-4 py-3 font-mono text-xs text-gray-700">{mapping.csv_column}</td>
      <td className="px-4 py-3">
        <select
          value={mapping.schema_field ?? ''}
          onChange={(e) =>
            onFieldChange(mapping.csv_column, (e.target.value as SchemaField) || null)
          }
          className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
        >
          <option value="">(not mapped)</option>
          {SCHEMA_FIELDS.map((field) => (
            <option key={field} value={field}>
              {FIELD_LABELS[field]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        {mapping.schema_field ? (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_CLASSES[mapping.confidence]}`}
          >
            {mapping.confidence}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
    </tr>
  )
}

function StageResolutionRow({
  csvValue,
  stageId,
  stages,
  onChange,
}: {
  csvValue: string
  stageId: string | null
  stages: FirmStage[]
  onChange: (csvValue: string, stageId: string | null) => void
}) {
  return (
    <tr>
      <td className="px-4 py-3 font-mono text-xs text-gray-700">"{csvValue}"</td>
      <td className="px-4 py-3">
        <select
          value={stageId ?? ''}
          onChange={(e) => onChange(csvValue, e.target.value || null)}
          className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
        >
          <option value="">(skip — no stage)</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </td>
    </tr>
  )
}
