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
    <div id="firm-inbox" style={{ background: '#272735', border: '1px solid rgba(82,102,235,0.3)', borderRadius: '8px', padding: '20px 24px', marginBottom: '24px' }}>
      <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5266eb', marginBottom: '8px' }}>
        Your Firm Deal Inbox
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#ededf3', fontFamily: 'ui-monospace, monospace', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {address}
          </p>
          <p style={{ fontSize: '13px', color: '#70707d', lineHeight: 1.6 }}>
            Forward broker emails with PDF offering memorandums here. Dealstash extracts the details, scores the deal, stores the OM, and adds it to your first pipeline stage.
          </p>
        </div>
        <button
          type="button"
          onClick={copyAddress}
          style={{ background: '#5266eb', color: '#ffffff', border: 'none', borderRadius: '32px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          {copied ? 'Copied ✓' : 'Copy address'}
        </button>
      </div>
    </div>
  )
}
