'use client'

import { useEffect, useRef, useState } from 'react'
import type { UploadResult } from './UploadStep'
import type { MappingResult } from './MappingStep'
import type { ImportResponse } from '@/app/api/import/deals/import/route'

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'running' | 'done' | 'error'

type Props = {
  uploadResult: UploadResult
  mappingResult: MappingResult
  dealsHref?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportStep({ uploadResult, mappingResult, dealsHref = '/pipeline' }: Props) {
  const [status, setStatus] = useState<Status>('running')
  const [result, setResult] = useState<ImportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Guard against double-fire in React Strict Mode
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true

    const { allRows } = uploadResult
    const { columnMappings, stageResolutions, ownerUserId } = mappingResult

    fetch('/api/import/deals/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allRows, columnMappings, stageResolutions, ownerUserId }),
    })
      .then((res) =>
        res.ok
          ? (res.json() as Promise<ImportResponse>)
          : res.json().then((b) => Promise.reject((b as { error?: string }).error ?? res.status)),
      )
      .then((data) => {
        setResult(data)
        setStatus('done')
      })
      .catch((err) => {
        setError(typeof err === 'string' ? err : 'Import failed. Please try again.')
        setStatus('error')
      })
  }, [uploadResult, mappingResult])

  if (status === 'running') {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <Spinner />
        <p className="text-sm font-medium text-gray-600">Importing your deals…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <ErrorCircle />
        <p className="text-sm font-medium text-red-700">{error}</p>
        <p className="text-xs text-gray-500">
          No deals were imported. Please go back and try again.
        </p>
      </div>
    )
  }

  // done
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <CheckCircle />
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Import complete</h2>
        <p className="mt-1 text-sm text-gray-500">Your deals have been added to the pipeline.</p>
      </div>

      <div className="flex gap-6">
        <Stat label="Imported" value={result!.imported} color="green" />
        {result!.skipped > 0 && (
          <Stat label="Skipped (duplicate or no title)" value={result!.skipped} color="gray" />
        )}
      </div>

      <a
        href={dealsHref}
        className="mt-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        View your deals →
      </a>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: number; color: 'green' | 'gray' }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={`text-3xl font-bold ${color === 'green' ? 'text-green-600' : 'text-gray-400'}`}
      >
        {value}
      </span>
      <span className="mt-1 text-xs text-gray-500">{label}</span>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function CheckCircle() {
  return (
    <svg
      className="h-14 w-14 text-green-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function ErrorCircle() {
  return (
    <svg
      className="h-14 w-14 text-red-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  )
}
