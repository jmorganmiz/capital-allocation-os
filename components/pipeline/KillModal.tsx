'use client'

import { useState } from 'react'
import { Deal, KillReason } from '@/lib/types/database'

interface Props {
  deal: Deal
  killReasons: KillReason[]
  onConfirm: (killReasonId: string, notes: string) => void
  onCancel: () => void
}

export default function KillModal({ deal, killReasons, onConfirm, onCancel }: Props) {
  const [killReasonId, setKillReasonId] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-red-500 text-lg">✕</span>
          <h2 className="text-lg font-semibold text-gray-900">Kill Deal</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5 pl-6">"{deal.title}"</p>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Kill Reason <span className="text-red-500">*</span>
        </label>
        <select
          value={killReasonId}
          onChange={e => setKillReasonId(e.target.value)}
          className="input-base mb-4"
        >
          <option value="">Select reason…</option>
          {killReasons.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          className="input-base mb-5 resize-none"
          placeholder="What led to this decision?"
        />

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-ghost">Cancel</button>
          <button
            onClick={() => { if (killReasonId) onConfirm(killReasonId, notes) }}
            disabled={!killReasonId}
            className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Kill Deal
          </button>
        </div>
      </div>
    </div>
  )
}
