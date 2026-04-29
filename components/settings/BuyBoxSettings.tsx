'use client'

import { useState, useTransition } from 'react'
import { createBuyBox, updateBuyBox, deleteBuyBox } from '@/lib/actions/buybox'
import { ASSET_TYPES, type BuyBoxWithCriteria } from '@/lib/constants/buybox'

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  const pct = (v: number | null) => v != null ? (v * 100).toFixed(2).replace(/\.?0+$/, '') : ''
  return {
    name:                     box.name,
    asset_type:               box.asset_type,
    min_cap_rate:             pct(box.min_cap_rate),
    max_asking_price:         box.max_asking_price != null ? String(box.max_asking_price) : '',
    min_noi:                  box.min_noi != null ? String(box.min_noi) : '',
    preferred_markets:        box.preferred_markets ?? '',
    preferred_deal_structure: box.preferred_deal_structure ?? '',
    notes:                    box.notes ?? '',
    criteria: (box.buy_box_criteria ?? [])
      .sort((a, b) => a.position - b.position)
      .map(c => ({ tempId: c.id, name: c.name, description: c.description ?? '' })),
  }
}

function formToInput(form: FormState) {
  const pct = (v: string) => v.trim() !== '' ? parseFloat(v) / 100 : null
  const num = (v: string) => v.trim() !== '' ? parseFloat(v) : null
  return {
    name:                     form.name.trim(),
    asset_type:               form.asset_type,
    min_cap_rate:             pct(form.min_cap_rate),
    max_asking_price:         num(form.max_asking_price),
    min_noi:                  num(form.min_noi),
    preferred_markets:        form.preferred_markets.trim() || null,
    preferred_deal_structure: form.preferred_deal_structure.trim() || null,
    notes:                    form.notes.trim() || null,
    criteria:                 form.criteria
      .filter(c => c.name.trim())
      .map(c => ({ name: c.name.trim(), description: c.description.trim() })),
  }
}

function summaryLine(box: BuyBoxWithCriteria): string {
  const parts: string[] = []
  if (box.min_cap_rate != null)    parts.push(`Cap ≥ ${(box.min_cap_rate * 100).toFixed(1)}%`)
  if (box.max_asking_price != null) parts.push(`Max $${(box.max_asking_price / 1_000_000).toFixed(1)}M`)
  if (box.min_noi != null)          parts.push(`NOI ≥ $${Number(box.min_noi).toLocaleString()}`)
  if (box.preferred_markets)        parts.push(box.preferred_markets)
  return parts.join(' · ') || 'No thresholds set'
}

let tempIdCounter = 0
function nextTempId() { return `t-${++tempIdCounter}` }

// ── Form component ─────────────────────────────────────────────────────────────

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
  const isEditing = !!(initial as any).__id

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function addCriterion() {
    setForm(prev => ({
      ...prev,
      criteria: [...prev.criteria, { tempId: nextTempId(), name: '', description: '' }],
    }))
  }

  function updateCriterion(tempId: string, field: 'name' | 'description', value: string) {
    setForm(prev => ({
      ...prev,
      criteria: prev.criteria.map(c => c.tempId === tempId ? { ...c, [field]: value } : c),
    }))
  }

  function removeCriterion(tempId: string) {
    setForm(prev => ({ ...prev, criteria: prev.criteria.filter(c => c.tempId !== tempId) }))
  }

  function handleSave() {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setError(null)
    const input = formToInput(form)
    startTransition(async () => {
      const id = (initial as any).__id as string | undefined
      const result = id
        ? await updateBuyBox(id, input)
        : await createBuyBox(input)
      if (result.error) { setError(result.error); return }
      if (result.buyBox) onSave(result.buyBox)
    })
  }

  return (
    <div className="border border-gray-200 rounded-lg p-5 bg-white">
      {/* Name + asset type */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Buy Box Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Sunbelt Multifamily Core"
            className="input-base"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Asset Type</label>
          <select
            value={form.asset_type}
            onChange={e => set('asset_type', e.target.value)}
            className="input-base"
          >
            {ASSET_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Thresholds */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Thresholds</p>
      <div className="grid grid-cols-2 gap-3 mb-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Min Cap Rate (%)</label>
          <input type="number" step="any" value={form.min_cap_rate}
            onChange={e => set('min_cap_rate', e.target.value)}
            placeholder="5.5" className="input-base" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Max Asking Price ($)</label>
          <input type="number" step="any" value={form.max_asking_price}
            onChange={e => set('max_asking_price', e.target.value)}
            placeholder="20000000" className="input-base" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Min NOI ($)</label>
          <input type="number" step="any" value={form.min_noi}
            onChange={e => set('min_noi', e.target.value)}
            placeholder="150000" className="input-base" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Preferred Markets</label>
          <input type="text" value={form.preferred_markets}
            onChange={e => set('preferred_markets', e.target.value)}
            placeholder="Austin TX, Nashville TN…" className="input-base" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Preferred Deal Structure</label>
          <input type="text" value={form.preferred_deal_structure}
            onChange={e => set('preferred_deal_structure', e.target.value)}
            placeholder="Value-add, NNN, sale-leaseback…" className="input-base" />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Any other criteria the AI should consider when scoring this asset type…"
          rows={2}
          className="input-base resize-none"
        />
      </div>

      {/* Custom criteria */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Custom Criteria</p>
      {form.criteria.length === 0 && (
        <p className="text-xs text-gray-400 mb-2">No custom criteria — the AI will use your firm's default scoring criteria.</p>
      )}
      <div className="space-y-2 mb-2">
        {form.criteria.map(c => (
          <div key={c.tempId} className="flex gap-2 items-start">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input
                type="text"
                value={c.name}
                onChange={e => updateCriterion(c.tempId, 'name', e.target.value)}
                placeholder="Criterion name"
                className="input-base text-sm"
              />
              <input
                type="text"
                value={c.description}
                onChange={e => updateCriterion(c.tempId, 'description', e.target.value)}
                placeholder="Description / scoring notes"
                className="input-base text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => removeCriterion(c.tempId)}
              className="mt-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              aria-label="Remove criterion"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addCriterion}
        className="text-xs text-blue-600 hover:underline mb-4"
      >
        + Add criterion
      </button>

      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

      <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">Cancel</button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Buy Box'}
        </button>
      </div>
    </div>
  )
}

// ── Card component ─────────────────────────────────────────────────────────────

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
    const initial = { ...boxToForm(box), __id: box.id } as any
    return (
      <BuyBoxForm
        initial={initial}
        onSave={updated => { onUpdated(updated); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  const criteriaCount = box.buy_box_criteria?.length ?? 0

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-semibold text-gray-900">{box.name}</h3>
            <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              {box.asset_type}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">{summaryLine(box)}</p>
          {criteriaCount > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {criteriaCount} custom {criteriaCount === 1 ? 'criterion' : 'criteria'}
            </p>
          )}
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            {isPending ? '…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BuyBoxSettings({ buyBoxes: initial }: { buyBoxes: BuyBoxWithCriteria[] }) {
  const [boxes, setBoxes] = useState<BuyBoxWithCriteria[]>(initial)
  const [creating, setCreating] = useState(false)

  function handleCreated(box: BuyBoxWithCriteria) {
    setBoxes(prev => [box, ...prev])
    setCreating(false)
  }

  function handleUpdated(box: BuyBoxWithCriteria) {
    setBoxes(prev => prev.map(b => b.id === box.id ? box : b))
  }

  function handleDeleted(id: string) {
    setBoxes(prev => prev.filter(b => b.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Buy Box</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Define your investment thesis by asset type. The AI uses these thresholds and criteria when scoring inbound deals.
          </p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="btn-primary text-sm flex-shrink-0">
            + New Buy Box
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-4">
          <BuyBoxForm
            initial={blankForm()}
            onSave={handleCreated}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {boxes.length === 0 && !creating ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-12 text-center">
          <p className="text-sm font-medium text-gray-600 mb-1">No buy boxes yet</p>
          <p className="text-xs text-gray-400 mb-4">Define your first investment thesis to guide AI scoring.</p>
          <button onClick={() => setCreating(true)} className="btn-secondary text-sm">
            + Create Buy Box
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {boxes.map(box => (
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
