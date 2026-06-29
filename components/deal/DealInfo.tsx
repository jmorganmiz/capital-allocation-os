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

const cellStyle = {
  background: 'rgba(39,39,53,0.82)',
  border: '1px solid rgba(112,112,125,0.18)',
  borderRadius: '12px',
  padding: '18px 18px',
}

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 600,
  color: 'var(--lead)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: '10px',
}

const valueStyle: React.CSSProperties = {
  fontSize: '17px',
  fontWeight: 650,
  color: 'var(--starlight)',
}

const emptyValueStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--lead)',
  fontStyle: 'italic',
}

function EditableText({ label, value, placeholder, onSave, disabled }: {
  label: string; value: string | null; placeholder: string
  onSave: (v: string | null) => void; disabled: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    onSave(trimmed || null)
  }

  return (
    <div style={cellStyle}>
      <p style={labelStyle}>{label}</p>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false) } }}
          className="input-base w-full"
          placeholder={placeholder}
          style={{ padding: '4px 8px', fontSize: '13px' }}
        />
      ) : (
        <button
          disabled={disabled}
          onClick={() => { setDraft(value ?? ''); setEditing(true) }}
          className="text-left w-full transition-colors hover:opacity-70 disabled:cursor-default"
          style={value ? valueStyle : emptyValueStyle}
        >
          {value ?? placeholder}
        </button>
      )}
    </div>
  )
}

function EditableSelect({ label, value, options, onSave, disabled }: {
  label: string; value: string | null; options: string[]
  onSave: (v: string | null) => void; disabled: boolean
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div style={cellStyle}>
      <p style={labelStyle}>{label}</p>
      {editing ? (
        <select
          autoFocus
          defaultValue={value ?? ''}
          onBlur={e => { onSave(e.target.value || null); setEditing(false) }}
          onChange={e => { onSave(e.target.value || null); setEditing(false) }}
          className="input-base w-full"
          style={{ padding: '4px 8px', fontSize: '13px' }}
        >
          <option value="">—</option>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <button
          disabled={disabled}
          onClick={() => setEditing(true)}
          className="text-left w-full transition-colors hover:opacity-70 disabled:cursor-default"
          style={value ? valueStyle : emptyValueStyle}
        >
          {value ?? '—'}
        </button>
      )}
    </div>
  )
}

function EditablePrice({ label, value, onSave, disabled }: {
  label: string; value: number | null
  onSave: (v: number | null) => void; disabled: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value != null ? String(value) : '')

  function commit() {
    setEditing(false)
    onSave(parsePrice(draft))
  }

  return (
    <div style={cellStyle}>
      <p style={labelStyle}>{label}</p>
      {editing ? (
        <input
          autoFocus
          type="number"
          min="0"
          step="1"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value != null ? String(value) : ''); setEditing(false) } }}
          className="input-base w-full"
          placeholder="5000000"
          style={{ padding: '4px 8px', fontSize: '13px' }}
        />
      ) : (
        <button
          disabled={disabled}
          onClick={() => { setDraft(value != null ? String(value) : ''); setEditing(true) }}
          className="text-left w-full transition-colors hover:opacity-70 disabled:cursor-default"
          style={value != null ? valueStyle : emptyValueStyle}
        >
          {value != null ? formatPrice(value) : '—'}
        </button>
      )}
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Deal Info</h2>
        {isPending && <span style={{ fontSize: '11px', color: 'var(--amber)' }}>Saving…</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
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
