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
    <div id="firm-inbox" className="app-intake-panel app-intake-inbox">
      <p className="app-intake-kicker">Your firm deal inbox</p>
      <div className="app-intake-inbox-address">
        <code>{address}</code>
        <button type="button" onClick={copyAddress} className="btn-primary whitespace-nowrap">
          {copied ? 'Copied ✓' : 'Copy address'}
        </button>
      </div>
      <p className="app-intake-inbox-copy">
        Forward broker emails with PDF offering memorandums here. Dealstash extracts the details,
        scores the deal, stores the OM, and adds it to your first pipeline stage.
      </p>
    </div>
  )
}
