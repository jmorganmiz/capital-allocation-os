'use client'

import { useState } from 'react'

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(112,112,125,0.3)',
  color: '#f4f4f8',
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium" style={{ color: '#a8a8b8' }}>
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  )
}

export default function BrokerSubmitForm({ slug, firmName }: { slug: string; firmName: string }) {
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/portal/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...Object.fromEntries(form.entries()) }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
      } else {
        setDone(data.note ?? `Submitted — the ${firmName} team will review it and reach out if it fits.`)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="mt-8 rounded-lg border p-6 text-center" style={{ borderColor: 'rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.08)' }}>
        <p className="text-sm font-medium" style={{ color: '#4ade80' }}>{done}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      {/* Honeypot — hidden from humans, filled by bots */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required>
          <input name="brokerName" required maxLength={120} className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle} />
        </Field>
        <Field label="Your email" required>
          <input name="brokerEmail" type="email" required maxLength={200} className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle} />
        </Field>
      </div>
      <Field label="Brokerage / company">
        <input name="brokerCompany" maxLength={160} className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle} />
      </Field>

      <hr style={{ borderColor: 'rgba(112,112,125,0.2)' }} />

      <Field label="Property name" required>
        <input name="propertyName" required maxLength={200} placeholder="e.g. The Riley — 8 Units" className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Address">
          <input name="address" maxLength={300} className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle} />
        </Field>
        <Field label="Market">
          <input name="market" maxLength={160} placeholder="e.g. Richmond, VA" className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Asset type">
          <input name="assetType" maxLength={120} placeholder="Multifamily" className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle} />
        </Field>
        <Field label="Asking price ($)">
          <input name="askingPrice" inputMode="numeric" maxLength={15} placeholder="2500000" className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle} />
        </Field>
        <Field label="Units">
          <input name="unitCount" inputMode="numeric" maxLength={6} className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle} />
        </Field>
      </div>
      <Field label="Listing link">
        <input name="sourceUrl" type="url" maxLength={2000} placeholder="https://" className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle} />
      </Field>
      <Field label="Anything else the team should know?">
        <textarea name="brokerMessage" maxLength={2000} rows={3} className="w-full rounded-md px-3 py-2 text-sm" style={inputStyle} />
      </Field>

      {error && <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: '#6366f1', color: '#ffffff' }}
      >
        {submitting ? 'Submitting…' : `Submit deal to ${firmName}`}
      </button>
    </form>
  )
}
