'use client'

import { useState } from 'react'
import { UploadStep, type UploadResult } from './_components/UploadStep'
import { MappingStep, type MappingResult } from './_components/MappingStep'
import { PreviewStep } from './_components/PreviewStep'
import { ImportStep } from './_components/ImportStep'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'mapping' | 'preview' | 'import'

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'mapping', label: 'Map Columns' },
  { key: 'preview', label: 'Preview' },
  { key: 'import', label: 'Import' },
]

const STEP_ORDER: Record<Step, number> = {
  upload: 0,
  mapping: 1,
  preview: 2,
  import: 3,
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportDealsPage() {
  const [step, setStep] = useState<Step>('upload')
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(null)

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <StepIndicator current={step} />

      <div className="mt-8">
        {step === 'upload' && (
          <UploadStep
            onComplete={(result) => {
              setUploadResult(result)
              setStep('mapping')
            }}
          />
        )}

        {step === 'mapping' && uploadResult && (
          <MappingStep
            uploadResult={uploadResult}
            onComplete={(result) => {
              setMappingResult(result)
              setStep('preview')
            }}
            onBack={() => setStep('upload')}
          />
        )}

        {step === 'preview' && uploadResult && mappingResult && (
          <PreviewStep
            uploadResult={uploadResult}
            mappingResult={mappingResult}
            onConfirm={() => setStep('import')}
            onBack={() => setStep('mapping')}
          />
        )}

        {step === 'import' && uploadResult && mappingResult && (
          <ImportStep
            uploadResult={uploadResult}
            mappingResult={mappingResult}
          />
        )}
      </div>
    </div>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEP_ORDER[current]

  return (
    <nav aria-label="Import steps" className="flex items-center">
      {STEPS.map((s, idx) => {
        const done = idx < currentIdx
        const active = idx === currentIdx

        return (
          <div key={s.key} className="flex items-center">
            {idx > 0 && (
              <div className={`h-px w-10 ${done ? 'bg-blue-400' : 'bg-gray-200'}`} />
            )}
            <div
              className={`flex items-center gap-2 text-xs font-medium ${
                active ? 'text-blue-600' : done ? 'text-gray-500' : 'text-gray-400'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                  active
                    ? 'bg-blue-600 text-white'
                    : done
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {done ? '✓' : idx + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
