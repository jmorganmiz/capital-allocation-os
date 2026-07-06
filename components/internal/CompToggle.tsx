'use client'

import { useState } from 'react'
import { setFirmCompAccess } from '@/lib/internal/actions'

export default function CompToggle({ firmId, comped }: { firmId: string; comped: boolean }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    if (saving) return
    setError('')
    setSaving(true)
    const result = await setFirmCompAccess(firmId, !comped)
    if (result?.error) setError(result.error)
    setSaving(false)
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
        style={comped
          ? { background: 'rgba(99,102,241,0.2)', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.4)' }
          : { background: 'rgba(255,255,255,0.05)', color: '#8b8b9a', border: '1px solid rgba(112,112,125,0.3)' }}
        title={comped ? 'Revoke complimentary access' : 'Grant complimentary access'}
      >
        {saving ? '…' : comped ? 'Comped' : 'Comp'}
      </button>
      {error && <span className="text-xs" style={{ color: '#f87171' }}>{error}</span>}
    </span>
  )
}
