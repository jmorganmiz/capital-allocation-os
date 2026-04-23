'use client'

import { useCallback, useRef, useState } from 'react'
import Papa from 'papaparse'
import type { ColumnMapping, MapColumnsResponse } from '@/app/api/import/deals/map-columns/route'

// ─── Types ────────────────────────────────────────────────────────────────────

export type UploadResult = {
  headers: string[]
  allRows: Record<string, string>[]
  mappings: ColumnMapping[]
}

type Props = {
  onComplete: (result: UploadResult) => void
}

type Status = 'idle' | 'parsing' | 'mapping' | 'error'

const STATUS_LABEL: Record<Exclude<Status, 'idle' | 'error'>, string> = {
  parsing: 'Parsing your CSV…',
  mapping: 'Analyzing columns with AI…',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UploadStep({ onComplete }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(
    async (file: File) => {
      // Validate before doing any async work
      const isCsv =
        file.type === 'text/csv' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.toLowerCase().endsWith('.csv')

      if (!isCsv) {
        setError('Please upload a CSV file.')
        setStatus('error')
        return
      }

      setStatus('parsing')
      setError(null)

      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const headers = results.meta.fields ?? []
          const allRows = results.data

          if (headers.length === 0) {
            setError('The CSV file has no column headers.')
            setStatus('error')
            return
          }

          if (allRows.length === 0) {
            setError('The CSV file has no data rows.')
            setStatus('error')
            return
          }

          setStatus('mapping')

          try {
            const res = await fetch('/api/import/deals/map-columns', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ headers, sampleRows: allRows.slice(0, 3) }),
            })

            if (!res.ok) {
              const body = await res.json().catch(() => ({}))
              throw new Error(
                (body as { error?: string }).error ??
                  `Column mapping failed (${res.status})`,
              )
            }

            const { mappings } = (await res.json()) as MapColumnsResponse
            onComplete({ headers, allRows, mappings })
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : 'Column mapping failed. Please try again.',
            )
            setStatus('error')
          }
        },
        error: (err) => {
          setError(`Could not parse file: ${err.message}`)
          setStatus('error')
        },
      })
    },
    [onComplete],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      // Reset so the same file can be re-selected after an error
      e.target.value = ''
    },
    [processFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear when leaving the drop zone itself, not a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const isLoading = status === 'parsing' || status === 'mapping'

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Import deals from CSV</h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload a CSV export from your existing system. We'll map the columns automatically.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          'w-full max-w-lg rounded-xl border-2 border-dashed px-8 py-12 text-center transition-colors',
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-gray-400',
          isLoading ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
      >
        {isLoading ? (
          <LoadingState label={STATUS_LABEL[status as 'parsing' | 'mapping']} />
        ) : (
          <IdleState onBrowseClick={() => inputRef.current?.click()} />
        )}
      </div>

      {/* Error banner */}
      {status === 'error' && error && (
        <div className="flex w-full max-w-lg items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <ErrorIcon />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
          <button
            onClick={() => {
              setStatus('idle')
              setError(null)
            }}
            className="text-sm font-medium text-red-700 hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
        disabled={isLoading}
      />

      <a
        href="/test-import.csv"
        download
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M8 12.5L3 7.5h3V2h4v5.5h3L8 12.5z" />
          <path d="M2 14h12v-1.5H2V14z" />
        </svg>
        Download sample CSV to try it out
      </a>

      <p className="text-xs text-gray-400">CSV files up to 500 rows</p>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IdleState({ onBrowseClick }: { onBrowseClick: () => void }) {
  return (
    <>
      <UploadIcon />
      <p className="mt-4 text-sm font-medium text-gray-700">
        Drag and drop your CSV here
      </p>
      <p className="mt-1 text-xs text-gray-500">or</p>
      <button
        type="button"
        onClick={onBrowseClick}
        className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Choose file
      </button>
    </>
  )
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Spinner />
      <p className="text-sm font-medium text-gray-600">{label}</p>
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className="h-6 w-6 animate-spin text-blue-600"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg
      className="mx-auto h-10 w-10 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-4.75a.75.75 0 001.5 0V9a.75.75 0 00-1.5 0v4.25zm.75-7a.75.75 0 100 1.5.75.75 0 000-1.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}
