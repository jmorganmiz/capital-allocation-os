'use client'

import { useEffect, useState } from 'react'
import type { UploadResult } from './UploadStep'
import type { MappingResult } from './MappingStep'
import type { FirmDataResponse, FirmMember, FirmStage } from '@/app/api/import/deals/firm-data/route'
import type { ColumnMapping } from '@/app/api/import/deals/map-columns/route'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  uploadResult: UploadResult
  mappingResult: MappingResult
  onConfirm: () => void
  onBack: () => void
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  stage_id: 'Stage',
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

const PREVIEW_LIMIT = 10

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveDisplayValue(
  row: Record<string, string>,
  mapping: ColumnMapping,
  stageResolutions: Record<string, string | null>,
  stages: FirmStage[],
): string {
  const raw = row[mapping.csv_column]?.trim() ?? ''
  if (!raw) return ''

  if (mapping.schema_field === 'stage_id') {
    const stageId = stageResolutions[raw]
    return stageId ? (stages.find((s) => s.id === stageId)?.name ?? raw) : ''
  }

  return raw
}

function buildDisplayRows(
  allRows: Record<string, string>[],
  columnMappings: ColumnMapping[],
  stageResolutions: Record<string, string | null>,
  stages: FirmStage[],
  ownerUserId: string | null,
  members: FirmMember[],
  ownerName: string,
): Array<{ values: Record<string, string>; hasTitle: boolean }> {
  return allRows.map((row) => {
    const values: Record<string, string> = {}

    for (const m of columnMappings) {
      if (!m.schema_field) continue
      const v = resolveDisplayValue(row, m, stageResolutions, stages)
      if (v) values[m.schema_field] = v
    }

    if (ownerUserId) values['owner_user_id'] = ownerName

    return { values, hasTitle: Boolean(values['title']) }
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PreviewStep({ uploadResult, mappingResult, onConfirm, onBack }: Props) {
  const { allRows } = uploadResult
  const { columnMappings, stageResolutions, ownerUserId } = mappingResult

  const [stages, setStages] = useState<FirmStage[]>([])
  const [members, setMembers] = useState<FirmMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/import/deals/firm-data')
      .then((r) => r.json() as Promise<FirmDataResponse>)
      .then((d) => {
        setStages(d.stages)
        setMembers(d.members)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-500">
        Loading…
      </div>
    )
  }

  const ownerName =
    ownerUserId
      ? (members.find((m) => m.id === ownerUserId)?.full_name ??
          members.find((m) => m.id === ownerUserId)?.email ??
          ownerUserId)
      : ''

  const displayRows = buildDisplayRows(
    allRows,
    columnMappings,
    stageResolutions,
    stages,
    ownerUserId,
    members,
    ownerName,
  )

  const importableCount = displayRows.filter((r) => r.hasTitle).length
  const skippedCount = displayRows.length - importableCount

  // Ordered list of schema fields that are actually mapped (preserving column order)
  const mappedFields = [
    ...columnMappings
      .filter((m) => m.schema_field !== null)
      .map((m) => m.schema_field as string),
    ...(ownerUserId ? ['owner_user_id'] : []),
  ].filter((f, i, arr) => arr.indexOf(f) === i)

  const previewRows = displayRows.slice(0, PREVIEW_LIMIT)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Preview import</h2>
        <p className="mt-1 text-sm text-gray-500">
          Showing the first {Math.min(PREVIEW_LIMIT, displayRows.length)} of {displayRows.length}{' '}
          rows with your column mappings applied.
        </p>
      </div>

      {/* Summary counts */}
      <div className="flex gap-4">
        <Chip color="green">{importableCount} will import</Chip>
        {skippedCount > 0 && (
          <Chip color="yellow">
            {skippedCount} missing title — will be skipped
          </Chip>
        )}
      </div>

      {/* Preview table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {mappedFields.map((field) => (
                <th
                  key={field}
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                >
                  {FIELD_LABELS[field] ?? field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {previewRows.map((row, i) => (
              <tr
                key={i}
                className={row.hasTitle ? '' : 'opacity-40'}
                title={row.hasTitle ? undefined : 'Missing title — will be skipped'}
              >
                {mappedFields.map((field) => (
                  <td key={field} className="px-4 py-3 text-gray-700">
                    {row.values[field] ?? (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {displayRows.length > PREVIEW_LIMIT && (
        <p className="text-xs text-gray-400">
          + {displayRows.length - PREVIEW_LIMIT} more rows not shown
        </p>
      )}

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
          onClick={onConfirm}
          disabled={importableCount === 0}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Import {importableCount} deal{importableCount !== 1 ? 's' : ''} →
        </button>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Chip({ color, children }: { color: 'green' | 'yellow'; children: React.ReactNode }) {
  const classes =
    color === 'green'
      ? 'bg-green-50 text-green-700 border-green-200'
      : 'bg-yellow-50 text-yellow-700 border-yellow-200'
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${classes}`}>
      {children}
    </span>
  )
}
