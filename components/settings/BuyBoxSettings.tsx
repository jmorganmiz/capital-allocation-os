'use client'

import { useState, useTransition } from 'react'
import { createBuyBox, deleteBuyBox, updateBuyBox } from '@/lib/actions/buybox'
import { ASSET_TYPES, type BuyBoxWithCriteria } from '@/lib/constants/buybox'

type CriterionDraft = { tempId: string; name: string; description: string }

type FormState = {
  name: string
  asset_type: string
  min_cap_rate: string
  max_asking_price: string
  min_noi: string
  preferred_markets: string
  preferred_deal_structure: string
  notes: string
  criteria: CriterionDraft[]
}

function blankForm(): FormState {
  return {
    name: '',
    asset_type: 'Multifamily',
    min_cap_rate: '',
    max_asking_price: '',
    min_noi: '',
    preferred_markets: '',
    preferred_deal_structure: '',
    notes: '',
    criteria: [],
  }
}

function boxToForm(box: BuyBoxWithCriteria): FormState {
  const pct = (value: number | null) => value != null ? (value * 100).toFixed(2).replace(/\.?0+$/, '') : ''
  return {
    name: box.name,
    asset_type: box.asset_type,
    min_cap_rate: pct(box.min_cap_rate),
    max_asking_price: box.max_asking_price != null ? String(box.max_asking_price) : '',
    min_noi: box.min_noi != null ? String(box.min_noi) : '',
    preferred_markets: box.preferred_markets ?? '',
    preferred_deal_structure: box.preferred_deal_structure ?? '',
    notes: box.notes ?? '',
    criteria: (box.buy_box_criteria ?? [])
      .sort((a, b) => a.position - b.position)
      .map((criterion) => ({
        tempId: criterion.id,
        name: criterion.name,
        description: criterion.description ?? '',
      })),
  }
}

function formToInput(form: FormState) {
  const pct = (value: string) => value.trim() !== '' ? parseFloat(value) / 100 : null
  const num = (value: string) => value.trim() !== '' ? parseFloat(value) : null
  return {
    name: form.name.trim(),
    asset_type: form.asset_type,
    min_cap_rate: pct(form.min_cap_rate),
    max_asking_price: num(form.max_asking_price),
    min_noi: num(form.min_noi),
    preferred_markets: form.preferred_markets.trim() || null,
    preferred_deal_structure: form.preferred_deal_structure.trim() || null,
    notes: form.notes.trim() || null,
    criteria: form.criteria
      .filter((criterion) => criterion.name.trim())
      .map((criterion) => ({
        name: criterion.name.trim(),
        description: criterion.description.trim(),
      })),
  }
}

function summaryLine(box: BuyBoxWithCriteria): string {
  const parts: string[] = []
  if (box.min_cap_rate != null) parts.push(`Cap >= ${(box.min_cap_rate * 100).toFixed(1)}%`)
  if (box.max_asking_price != null) parts.push(`Max $${(box.max_asking_price / 1_000_000).toFixed(1)}M`)
  if (box.min_noi != null) parts.push(`NOI >= $${Number(box.min_noi).toLocaleString()}`)
  if (box.preferred_markets) parts.push(box.preferred_markets)
  return parts.join(' · ') || 'No thresholds set'
}

let tempIdCounter = 0
function nextTempId() {
  tempIdCounter += 1
  return `t-${tempIdCounter}`
}

function BuyBoxForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: FormState
  onSave: (box: BuyBoxWithCriteria) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isEditing = Boolean((initial as FormState & { __id?: string }).__id)

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function addCriterion() {
    setForm((prev) => ({
      ...prev,
      criteria: [...prev.criteria, { tempId: nextTempId(), name: '', description: '' }],
    }))
  }

  function updateCriterion(tempId: string, field: 'name' | 'description', value: string) {
    setForm((prev) => ({
      ...prev,
      criteria: prev.criteria.map((criterion) => criterion.tempId === tempId ? { ...criterion, [field]: value } : criterion),
    }))
  }

  function removeCriterion(tempId: string) {
    setForm((prev) => ({ ...prev, criteria: prev.criteria.filter((criterion) => criterion.tempId !== tempId) }))
  }

  function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }

    setError(null)
    const input = formToInput(form)
    startTransition(async () => {
      const id = (initial as FormState & { __id?: string }).__id
      const result = id
        ? await updateBuyBox(id, input)
        : await createBuyBox(input)

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.buyBox) onSave(result.buyBox)
    })
  }

  return (
    <div className="app-settings-buybox-form">
      <div className="app-settings-form-grid two">
        <label className="app-settings-field">
          <span>Buy box name</span>
          <input
            type="text"
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
            placeholder="Sunbelt Multifamily Core"
            autoFocus
          />
        </label>

        <label className="app-settings-field">
          <span>Asset type</span>
          <select
            value={form.asset_type}
            onChange={(event) => set('asset_type', event.target.value)}
          >
            {ASSET_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="app-settings-form-block">
        <p>Return thresholds</p>
        <div className="app-settings-form-grid three">
          <label className="app-settings-field">
            <span>Min cap rate (%)</span>
            <input
              type="number"
              step="any"
              value={form.min_cap_rate}
              onChange={(event) => set('min_cap_rate', event.target.value)}
              placeholder="5.5"
            />
          </label>

          <label className="app-settings-field">
            <span>Max asking price ($)</span>
            <input
              type="number"
              step="any"
              value={form.max_asking_price}
              onChange={(event) => set('max_asking_price', event.target.value)}
              placeholder="20000000"
            />
          </label>

          <label className="app-settings-field">
            <span>Min NOI ($)</span>
            <input
              type="number"
              step="any"
              value={form.min_noi}
              onChange={(event) => set('min_noi', event.target.value)}
              placeholder="150000"
            />
          </label>
        </div>
      </div>

      <div className="app-settings-form-grid two">
        <label className="app-settings-field">
          <span>Preferred markets</span>
          <input
            type="text"
            value={form.preferred_markets}
            onChange={(event) => set('preferred_markets', event.target.value)}
            placeholder="Austin TX, Nashville TN..."
          />
        </label>

        <label className="app-settings-field">
          <span>Preferred deal structure</span>
          <input
            type="text"
            value={form.preferred_deal_structure}
            onChange={(event) => set('preferred_deal_structure', event.target.value)}
            placeholder="Value-add, NNN, sale-leaseback..."
          />
        </label>
      </div>

      <label className="app-settings-field">
        <span>AI notes</span>
        <textarea
          value={form.notes}
          onChange={(event) => set('notes', event.target.value)}
          placeholder="Any other criteria the AI should consider when scoring this asset type..."
          rows={3}
        />
      </label>

      <div className="app-settings-form-block">
        <div className="app-settings-form-block-title">
          <p>Custom criteria</p>
          <button type="button" onClick={addCriterion}>+ Add criterion</button>
        </div>

        {form.criteria.length === 0 ? (
          <div className="app-settings-empty-row">
            No custom criteria yet. Dealstash will use your firm default scoring criteria.
          </div>
        ) : (
          <div className="app-settings-criteria-list">
            {form.criteria.map((criterion) => (
              <div key={criterion.tempId} className="app-settings-criterion-row">
                <input
                  type="text"
                  value={criterion.name}
                  onChange={(event) => updateCriterion(criterion.tempId, 'name', event.target.value)}
                  placeholder="Criterion name"
                />
                <input
                  type="text"
                  value={criterion.description}
                  onChange={(event) => updateCriterion(criterion.tempId, 'description', event.target.value)}
                  placeholder="Description / scoring notes"
                />
                <button
                  type="button"
                  onClick={() => removeCriterion(criterion.tempId)}
                  aria-label="Remove criterion"
                  data-danger="true"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="app-settings-status error">{error}</p>}

      <div className="app-settings-form-actions">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          data-primary="true"
        >
          {isPending ? 'Saving...' : isEditing ? 'Save changes' : 'Create buy box'}
        </button>
      </div>
    </div>
  )
}

function BuyBoxCard({
  box,
  onUpdated,
  onDeleted,
}: {
  box: BuyBoxWithCriteria
  onUpdated: (box: BuyBoxWithCriteria) => void
  onDeleted: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Delete "${box.name}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteBuyBox(box.id)
      onDeleted(box.id)
    })
  }

  if (editing) {
    const initial = { ...boxToForm(box), __id: box.id } as FormState & { __id: string }
    return (
      <BuyBoxForm
        initial={initial}
        onSave={(updated) => {
          onUpdated(updated)
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  const criteriaCount = box.buy_box_criteria?.length ?? 0

  return (
    <div className="app-settings-buybox-card">
      <div className="app-settings-buybox-main">
        <div className="app-settings-buybox-title-row">
          <h3>{box.name}</h3>
          <em>{box.asset_type}</em>
        </div>
        <p>{summaryLine(box)}</p>
        <span>
          {criteriaCount > 0
            ? `${criteriaCount} custom ${criteriaCount === 1 ? 'criterion' : 'criteria'}`
            : 'Using firm default scoring criteria'}
        </span>
      </div>

      <div className="app-settings-rule-actions">
        <button onClick={() => setEditing(true)}>Edit</button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          data-danger="true"
        >
          {isPending ? '...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

export default function BuyBoxSettings({ buyBoxes: initial }: { buyBoxes: BuyBoxWithCriteria[] }) {
  const [boxes, setBoxes] = useState<BuyBoxWithCriteria[]>(initial)
  const [creating, setCreating] = useState(false)

  function handleCreated(box: BuyBoxWithCriteria) {
    setBoxes((prev) => [box, ...prev])
    setCreating(false)
  }

  function handleUpdated(box: BuyBoxWithCriteria) {
    setBoxes((prev) => prev.map((existing) => existing.id === box.id ? box : existing))
  }

  function handleDeleted(id: string) {
    setBoxes((prev) => prev.filter((box) => box.id !== id))
  }

  return (
    <div>
      <div className="app-settings-section-header">
        <div>
          <p>Investment thesis</p>
          <h2>Buy Box</h2>
        </div>
        <span>{boxes.length} {boxes.length === 1 ? 'box' : 'boxes'}</span>
      </div>
      <p className="app-settings-section-copy">
        Define the markets, return thresholds, and thesis notes the AI should use when scoring inbound deals.
      </p>

      {!creating && (
        <div className="app-settings-toolbar">
          <button onClick={() => setCreating(true)} className="btn-primary">
            + New Buy Box
          </button>
        </div>
      )}

      {creating && (
        <div className="app-settings-buybox-create">
          <BuyBoxForm
            initial={blankForm()}
            onSave={handleCreated}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {boxes.length === 0 && !creating ? (
        <div className="app-settings-empty-state">
          <p>No buy boxes yet</p>
          <span>Define your first investment thesis to guide AI scoring.</span>
          <button onClick={() => setCreating(true)}>+ Create Buy Box</button>
        </div>
      ) : (
        <div className="app-settings-buybox-list">
          {boxes.map((box) => (
            <BuyBoxCard
              key={box.id}
              box={box}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </div>
  )
}
