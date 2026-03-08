'use client'

import { useState, useRef, useTransition } from 'react'
import { Deal, DealStage } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { createDealFromUpload } from '@/lib/actions/deals'

interface Props {
  stages: DealStage[]
  existingDeals: Deal[]
  onCreated: (deal: Deal) => void
  onCancel: () => void
}

export default function UploadOMModal({ stages, existingDeals, onCreated, onCancel }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [dealName, setDealName] = useState('')
  const [existingDealId, setExistingDealId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    if (mode === 'new' && !dealName) {
      setDealName(f.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '))
    }
  }

  async function handleSubmit() {
    if (!file) { setError('Please select a file.'); return }
    if (mode === 'new' && !dealName.trim()) { setError('Please enter a deal name.'); return }
    if (mode === 'existing' && !existingDealId) { setError('Please select a deal.'); return }

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setUploading(false); return }

    const { data: profile } = await supabase.from('profiles').select('firm_id').single()
    if (!profile) { setError('Profile not found'); setUploading(false); return }

    const targetDealId = mode === 'existing' ? existingDealId : null
    const storagePath = `${profile.firm_id}/${targetDealId ?? 'new'}/${Date.now()}_${file.name}`

    const { error: storageError } = await supabase.storage
      .from('deal-files')
      .upload(storagePath, file)

    if (storageError) { setError(storageError.message); setUploading(false); return }

    startTransition(async () => {
      const result = await createDealFromUpload({
        mode,
        dealName: dealName.trim(),
        existingDealId: existingDealId || null,
        storagePath,
        filename: file.name,
        mimeType: file.type || 'application/pdf',
        sizeBytes: file.size,
        stageId: stages[0]?.id ?? '',
      })

      if (result.error) {
        setError(result.error)
        setUploading(false)
      } else if (result.deal) {
        onCreated(result.deal as Deal)
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Upload Offering Memorandum</h2>
        <p className="text-sm text-gray-500 mb-5">Upload a PDF to create a new deal or attach to an existing one.</p>

        <div
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer mb-5 transition-colors
            ${file ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
        >
          {file ? (
            <div>
              <p className="text-sm font-medium text-blue-700">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500">Click to select a PDF</p>
              <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
            </div>
          )}
          <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
        </div>

        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setMode('new')}
            className={`flex-1 text-sm py-2 rounded-md border transition-colors
              ${mode === 'new' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            Create New Deal
          </button>
          <button
            onClick={() => setMode('existing')}
            className={`flex-1 text-sm py-2 rounded-md border transition-colors
              ${mode === 'existing' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            Attach to Existing
          </button>
        </div>

        {mode === 'new' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deal Name</label>
            <input
              value={dealName}
              onChange={e => setDealName(e.target.value)}
              className="input-base"
              placeholder="Auto-filled from filename"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Deal</label>
            <select value={existingDealId} onChange={e => setExistingDealId(e.target.value)} className="input-base">
              <option value="">Choose a deal…</option>
              {existingDeals.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex gap-3 justify-end mt-5">
          <button onClick={onCancel} className="btn-ghost">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={uploading || isPending || !file}
            className="btn-primary disabled:opacity-50"
          >
            {uploading || isPending ? 'Uploading…' : 'Upload & Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
