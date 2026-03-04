'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadFileMetadata } from '@/lib/actions/deals'
import { DealFile } from '@/lib/types/database'

interface Props {
  dealId: string
  files: DealFile[]
}

export default function FilesSection({ dealId, files: initialFiles }: Props) {
  const [files, setFiles] = useState<DealFile[]>(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setUploading(false); return }

    const { data: profile } = await supabase.from('profiles').select('firm_id').single()
    if (!profile) { setError('Profile not found'); setUploading(false); return }

    const storagePath = `${profile.firm_id}/${dealId}/${Date.now()}_${file.name}`

    const { error: storageError } = await supabase.storage
      .from('deal-files')
      .upload(storagePath, file)

    if (storageError) { setError(storageError.message); setUploading(false); return }

    const result = await uploadFileMetadata({
      dealId,
      storagePath,
      filename:  file.name,
      mimeType:  file.type || null,
      sizeBytes: file.size,
    })

    if (result.error) {
      setError(result.error)
    } else if (result.file) {
      setFiles(prev => [result.file as DealFile, ...prev])
    }

    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function getDownloadUrl(storagePath: string) {
    const supabase = createClient()
    const { data } = await supabase.storage
      .from('deal-files')
      .createSignedUrl(storagePath, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  function formatBytes(bytes: number | null) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Files</h2>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-secondary text-sm disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : '+ Upload File'}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {files.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-sm text-gray-400">
          No files uploaded yet.
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
          {files.map(f => (
            <div key={f.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{f.filename}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatBytes(f.size_bytes)} · {new Date(f.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => getDownloadUrl(f.storage_path)}
                className="text-sm text-blue-600 hover:underline"
              >
                Download
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
