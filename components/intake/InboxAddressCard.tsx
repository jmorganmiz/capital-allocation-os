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
    <div id="firm-inbox" className="rounded-xl border border-blue-200 bg-blue-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Your firm deal inbox</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900">
          {address}
        </code>
        <button type="button" onClick={copyAddress} className="btn-primary whitespace-nowrap">
          {copied ? 'Copied' : 'Copy address'}
        </button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-blue-900/70">
        Forward broker emails with PDF offering memorandums here. Dealstash extracts the details, scores the deal, stores the OM, and adds it to your first pipeline stage.
      </p>
    </div>
  )
}
