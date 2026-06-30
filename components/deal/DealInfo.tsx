'use client'

import { useState, useTransition } from 'react'
import { updateDealFields } from '@/lib/actions/deals'
import { Deal } from '@/lib/types/database'

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

function DetailMetric({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="app-deal-metric">
      <p>{label}</p>
      {children}
    </div>
  )
}

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
  onSave: (value: string | null) => void
  disabled: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    onSave(trimmed || null)
  }

  return (
    <DetailMetric label={label}>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit()
            if (event.key === 'Escape') {
              setDraft(value ?? '')
              setEditing(false)
            }
          }}
          placeholder={placeholder}
        />
      ) : (
        <button
          disabled={disabled}
          onClick={() => {
            setDraft(value ?? '')
            setEditing(true)
          }}
          data-empty={!value}
        >
          {value ?? placeholder}
        </button>
      )}
    </DetailMetric>
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
  onSave: (value: string | null) => void
  disabled: boolean
}) {
  const [editing, setEditing] = useState(false)

  return (
    <DetailMetric label={label}>
      {editing ? (
        <select
          autoFocus
          defaultValue={value ?? ''}
          onBlur={(event) => {
            onSave(event.target.value || null)
            setEditing(false)
          }}
          onChange={(event) => {
            onSave(event.target.value || null)
            setEditing(false)
          }}
        >
          <option value="">—</option>
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
      ) : (
        <button
          disabled={disabled}
          onClick={() => setEditing(true)}
          data-empty={!value}
        >
          {value ?? '—'}
        </button>
      )}
    </DetailMetric>
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
  onSave: (value: number | null) => void
  disabled: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value != null ? String(value) : '')

  function commit() {
    setEditing(false)
    onSave(parsePrice(draft))
  }

  return (
    <DetailMetric label={label}>
      {editing ? (
        <input
          autoFocus
          type="number"
          min="0"
          step="1"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit()
            if (event.key === 'Escape') {
              setDraft(value != null ? String(value) : '')
              setEditing(false)
            }
          }}
          placeholder="5000000"
        />
      ) : (
        <button
          disabled={disabled}
          onClick={() => {
            setDraft(value != null ? String(value) : '')
            setEditing(true)
          }}
          data-empty={value == null}
        >
          {value != null ? formatPrice(value) : '—'}
        </button>
      )}
    </DetailMetric>
  )
}

export default function DealInfo({ deal }: Props) {
  const [isPending, startTransition] = useTransition()
  const [fields, setFields] = useState({
    asking_price: deal.asking_price,
    deal_structure: deal.deal_structure,
    financing_type: deal.financing_type,
    property_size: deal.property_size,
  })

  function save(patch: Partial<typeof fields>) {
    const updated = { ...fields, ...patch }
    setFields(updated)
    startTransition(async () => {
      await updateDealFields(deal.id, patch)
    })
  }

  return (
    <section className="app-deal-section">
      <div className="app-deal-section-header">
        <div>
          <p>Asset profile</p>
          <h2>Deal Info</h2>
        </div>
        {isPending && <span>Saving...</span>}
      </div>

      <div className="app-deal-metric-grid four">
        <EditablePrice
          label="Asking Price"
          value={fields.asking_price}
          onSave={(value) => save({ asking_price: value })}
          disabled={deal.is_archived || isPending}
        />
        <EditableText
          label="Property Size"
          value={fields.property_size}
          placeholder="45,000 SF"
          onSave={(value) => save({ property_size: value })}
          disabled={deal.is_archived || isPending}
        />
        <EditableSelect
          label="Deal Structure"
          value={fields.deal_structure}
          options={DEAL_STRUCTURES}
          onSave={(value) => save({ deal_structure: value })}
          disabled={deal.is_archived || isPending}
        />
        <EditableSelect
          label="Financing Type"
          value={fields.financing_type}
          options={FINANCING_TYPES}
          onSave={(value) => save({ financing_type: value })}
          disabled={deal.is_archived || isPending}
        />
      </div>
    </section>
  )
}
