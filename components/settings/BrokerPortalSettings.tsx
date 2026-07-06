'use client'

import { useState } from 'react'
import { setBrokerPortalEnabled } from '@/lib/actions/settings'

type Props = {
  enabled: boolean
  portalUrl: string | null
  isAdmin: boolean
}

export default function BrokerPortalSettings({ enabled: initialEnabled, portalUrl, isAdmin }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    if (!isAdmin || saving) return
    setError('')
    setSaving(true)
    const next = !enabled
    const result = await setBrokerPortalEnabled(next)
    if (result?.error) setError(result.error)
    else setEnabled(next)
    setSaving(false)
  }

  async function copy() {
    if (!portalUrl) return
    try {
      await navigator.clipboard.writeText(portalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Could not copy — select the link text instead.')
    }
  }

  return (
    <div className="app-settings-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="app-eyebrow">Deal flow</p>
          <h2 className="app-settings-card-title">Broker Portal</h2>
          <p className="app-settings-card-subtitle">
            A public page where brokers submit deals directly into your Property Finder inbox,
            pre-screened against your buy box. Your buy box asset types and markets are shown
            publicly; price ceilings stay private.
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={!isAdmin || saving}
          aria-pressed={enabled}
          className="rounded-full px-4 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-50"
          style={enabled
            ? { background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.35)' }
            : { background: 'rgba(255,255,255,0.06)', color: 'var(--silver)', border: '1px solid rgba(112,112,125,0.3)' }}
        >
          {saving ? 'Saving…' : enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      {enabled && portalUrl && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: 'rgba(112,112,125,0.25)', background: 'rgba(255,255,255,0.03)' }}>
          <code className="flex-1 truncate text-xs" style={{ color: 'var(--starlight)' }}>{portalUrl}</code>
          <button type="button" onClick={copy} className="rounded-md px-3 py-1 text-xs font-medium" style={{ background: 'rgba(99,102,241,0.15)', color: '#c7d2fe' }}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      )}
      {enabled && !portalUrl && (
        <p className="mt-3 text-xs" style={{ color: 'var(--lead)' }}>Your portal link appears once your firm inbox address is provisioned.</p>
      )}
      {error && <p className="mt-3 text-xs" style={{ color: '#f87171' }}>{error}</p>}
      {!isAdmin && <p className="mt-3 text-xs" style={{ color: 'var(--lead)' }}>Only administrators can change this setting.</p>}
    </div>
  )
}
