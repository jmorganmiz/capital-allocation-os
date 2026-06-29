'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadFileMetadata } from '@/lib/actions/deals'
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
    if (!user) { setError('Not authenticated'); setUploading(false); return }

    const { data: profile } = await supabase.from('profiles').select('firm_id').single()
    if (!profile) { setError('Profile not found'); setUploading(false); return }

    const storagePath = `${profile.firm_id}/${dealId}/${Date.now()}_${file.name}`
    const { error: storageError } = await supabase.storage.from('deal-files').upload(storagePath, file)
    if (storageError) { setError(storageError.message); setUploading(false); return }

    const result = await uploadFileMetadata({ dealId, storagePath, filename: file.name, mimeType: file.type || null, sizeBytes: file.size })
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
    const { data } = await supabase.storage.from('deal-files').createSignedUrl(storagePath, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Files</h2>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-secondary disabled:opacity-50"
          style={{ fontSize: '12px', padding: '5px 14px' }}
        >
          {uploading ? 'Uploading…' : '+ Upload'}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      {error && <p style={{ fontSize: '12px', color: '#f87171', marginBottom: '10px' }}>{error}</p>}

      {files.length === 0 ? (
        <div className="rounded-lg p-8 text-center" style={{ border: '1px dashed rgba(112,112,125,0.25)' }}>
          <p style={{ fontSize: '13px', color: 'var(--lead)' }}>No files uploaded yet.</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(112,112,125,0.18)' }}>
          {files.map((f, i) => (
            <div
              key={f.id}
              className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: i > 0 ? '1px solid rgba(112,112,125,0.12)' : 'none' }}
            >
              <div>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--starlight)' }}>{f.filename}</p>
                <p style={{ fontSize: '11px', color: 'var(--lead)', marginTop: '2px' }}>
                  {formatBytes(f.size_bytes)} · {new Date(f.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => getDownloadUrl(f.storage_path)}
                style={{ fontSize: '12px', color: 'var(--mercury-blue)', fontWeight: 500 }}
                className="hover:opacity-70 transition-opacity"
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
