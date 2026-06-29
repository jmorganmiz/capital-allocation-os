'use client'

import { useState } from 'react'

export default function InboxAddressCard({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)

  async function copyAddress() {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div id="firm-inbox" className="rounded-xl p-6" style={{
      background: 'var(--midnight-slate)',
      border: '1px solid rgba(82,102,235,0.3)',
      borderLeft: '3px solid var(--mercury-blue)',
      boxShadow: 'var(--card-shadow)',
    }}>
      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mercury-blue)', marginBottom: '10px' }}>
        Your Firm Deal Inbox
      </p>
      <div className="flex flex-col gap-3">
        <code className="min-w-0 overflow-x-auto rounded-lg px-3 py-3" style={{
          background: 'var(--graphite)',
          border: '1px solid rgba(112,112,125,0.18)',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--starlight)',
          fontFamily: 'ui-monospace, monospace',
        }}>
          {address}
        </code>
        <button type="button" onClick={copyAddress} className="btn-primary w-fit whitespace-nowrap">
          {copied ? 'Copied ✓' : 'Copy address'}
        </button>
      </div>
      <p style={{ marginTop: '14px', fontSize: '12px', lineHeight: 1.65, color: 'var(--lead)' }}>
        Forward broker emails with PDF offering memorandums here. Dealstash extracts the details, scores the deal, stores the OM, and adds it to your first pipeline stage.
      </p>
    </div>
  )
}
