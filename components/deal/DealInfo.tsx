'use client'

import { useState, useTransition } from 'react'
import { Deal } from '@/lib/types/database'
import { updateDealFields } from '@/lib/actions/deals'

const DEAL_STRUCTURES = ['Acquisition', 'Joint Venture', 'Sale-Leaseback', 'Recapitalization', 'Other']
const FINANCING_TYPES = ['Conventional', 'Bridge', 'CMBS', 'Agency', 'All Cash', 'Other']

interface Props {
  deal: Deal
}

function formatPrice(n: number | null): string {
  if (n == null) return '—'
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function parsePrice(raw: string): number | null {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : null
}

// A single inline-editable field
function EditableText({
  label,
  value,
  placeholder,
  onSave,
  disabled,
}: {
  label: string
  value: string | null
  placeholder: string
  onSave: (v: string | null) => void
  disabled: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    onSave(trimmed || null)
  }

  if (editing) {
    return (
      <div>
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false) } }}
          className="w-full text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder}
        />
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <button
        disabled={disabled}
        onClick={() => { setDraft(value ?? ''); setEditing(true) }}
        className="text-sm text-left w-full text-gray-800 hover:text-blue-600 disabled:cursor-default disabled:hover:text-gray-800 truncate"
      >
        {value ?? <span className="text-gray-300 italic">{placeholder}</span>}
      </button>
    </div>
  )
}

function EditableSelect({
  label,
  value,
  options,
  onSave,
  disabled,
}: {
  label: string
  value: string | null
  options: string[]
  onSave: (v: string | null) => void
  disabled: boolean
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div>
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <select
          autoFocus
          defaultValue={value ?? ''}
          onBlur={e => { onSave(e.target.value || null); setEditing(false) }}
          onChange={e => { onSave(e.target.value || null); setEditing(false) }}
          className="w-full text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">None</option>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <button
        disabled={disabled}
        onClick={() => setEditing(true)}
        className="text-sm text-left w-full text-gray-800 hover:text-blue-600 disabled:cursor-default disabled:hover:text-gray-800 truncate"
      >
        {value ?? <span className="text-gray-300 italic">—</span>}
      </button>
    </div>
  )
}

function EditablePrice({
  label,
  value,
  onSave,
  disabled,
}: {
  label: string
  value: number | null
  onSave: (v: number | null) => void
  disabled: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value != null ? String(value) : '')

  function commit() {
    setEditing(false)
    onSave(parsePrice(draft))
  }

  if (editing) {
    return (
      <div>
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <input
          autoFocus
          type="number"
          min="0"
          step="1"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value != null ? String(value) : ''); setEditing(false) } }}
          className="w-full text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="5000000"
        />
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <button
        disabled={disabled}
        onClick={() => { setDraft(value != null ? String(value) : ''); setEditing(true) }}
        className="text-sm text-left w-full text-gray-800 hover:text-blue-600 disabled:cursor-default disabled:hover:text-gray-800"
      >
        {value != null ? formatPrice(value) : <span className="text-gray-300 italic">—</span>}
      </button>
    </div>
  )
}

export default function DealInfo({ deal }: Props) {
  const [isPending, startTransition] = useTransition()
  const [fields, setFields] = useState({
    asking_price:   deal.asking_price,
    deal_structure: deal.deal_structure,
    financing_type: deal.financing_type,
    property_size:  deal.property_size,
  })

  function save(patch: Partial<typeof fields>) {
    const updated = { ...fields, ...patch }
    setFields(updated)
    startTransition(async () => {
      await updateDealFields(deal.id, patch)
    })
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Deal Info</h2>
        {isPending && <span className="text-xs text-amber-500">Saving…</span>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 bg-gray-50 border border-gray-100 rounded-lg px-4 py-4">
        <EditablePrice
          label="Asking Price"
          value={fields.asking_price}
          onSave={v => save({ asking_price: v })}
          disabled={deal.is_archived || isPending}
        />
        <EditableText
          label="Property Size"
          value={fields.property_size}
          placeholder="45,000 SF"
          onSave={v => save({ property_size: v })}
          disabled={deal.is_archived || isPending}
        />
        <EditableSelect
          label="Deal Structure"
          value={fields.deal_structure}
          options={DEAL_STRUCTURES}
          onSave={v => save({ deal_structure: v })}
          disabled={deal.is_archived || isPending}
        />
        <EditableSelect
          label="Financing Type"
          value={fields.financing_type}
          options={FINANCING_TYPES}
          onSave={v => save({ financing_type: v })}
          disabled={deal.is_archived || isPending}
        />
      </div>
    </section>
  )
}
