'use client'

import { useRef, useState } from 'react'
import { uploadFileMetadata } from '@/lib/actions/deals'
import { createClient } from '@/lib/supabase/client'
import { DealFile } from '@/lib/types/database'

interface Props {
  dealId: string
  files: DealFile[]
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
    if (!user) {
      setError('Not authenticated')
      setUploading(false)
      return
    }

    const { data: profile } = await supabase.from('profiles').select('firm_id').single()
    if (!profile) {
      setError('Profile not found')
      setUploading(false)
      return
    }

    const storagePath = `${profile.firm_id}/${dealId}/${Date.now()}_${file.name}`
    const { error: storageError } = await supabase.storage.from('deal-files').upload(storagePath, file)
    if (storageError) {
      setError(storageError.message)
      setUploading(false)
      return
    }

    const result = await uploadFileMetadata({ dealId, storagePath, filename: file.name, mimeType: file.type || null, sizeBytes: file.size })
    if (result.error) {
      setError(result.error)
    } else if (result.file) {
      setFiles((prev) => [result.file as DealFile, ...prev])
    }

    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function getDownloadUrl(storagePath: string) {
    const supabase = createClient()
    const { data } = await supabase.storage.from('deal-files').createSignedUrl(storagePath, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <>
      <div className="app-deal-section-header">
        <div>
          <p>Diligence room</p>
          <h2>Files</h2>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="app-deal-pill-button"
        >
          {uploading ? 'Uploading...' : '+ Upload'}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      {error && <p className="app-deal-error">{error}</p>}

      {files.length === 0 ? (
        <div className="app-deal-empty">No files uploaded yet.</div>
      ) : (
        <div className="app-deal-list">
          {files.map((file) => (
            <div key={file.id} className="app-deal-list-row">
              <div>
                <strong>{file.filename}</strong>
                <span>{formatBytes(file.size_bytes)} · {new Date(file.created_at).toLocaleDateString()}</span>
              </div>
              <button onClick={() => getDownloadUrl(file.storage_path)}>
                Download
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
