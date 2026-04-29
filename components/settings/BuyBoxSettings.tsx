'use client'

import { useState, useTransition } from 'react'
import { upsertBuyBox, ASSET_TYPES, type BuyBox } from '@/lib/actions/buybox'

interface Props {
  buyBoxes: BuyBox[]
}

type FormState = {
  min_cap_rate: string
  max_ltv: string
  min_dscr: string
  min_occupancy: string
  min_irr: string
  max_asking_price: string
  preferred_markets: string
  notes: string
}

function toForm(box: BuyBox): FormState {
  const pct = (v: number | null) => (v != null ? (v * 100).toFixed(2).replace(/\.?0+$/, '') : '')
  return {
    min_cap_rate:     pct(box.min_cap_rate),
    max_ltv:          pct(box.max_ltv),
    min_dscr:         box.min_dscr != null ? String(box.min_dscr) : '',
    min_occupancy:    pct(box.min_occupancy),
    min_irr:          pct(box.min_irr),
    max_asking_price: box.max_asking_price != null ? String(box.max_asking_price) : '',
    preferred_markets: box.preferred_markets ?? '',
    notes:            box.notes ?? '',
  }
}

function toPayload(form: FormState) {
  const pct = (v: string) => v.trim() !== '' ? parseFloat(v) / 100 : null
  const num = (v: string) => v.trim() !== '' ? parseFloat(v) : null
  return {
    min_cap_rate:     pct(form.min_cap_rate),
    max_ltv:          pct(form.max_ltv),
    min_dscr:         num(form.min_dscr),
    min_occupancy:    pct(form.min_occupancy),
    min_irr:          pct(form.min_irr),
    max_asking_price: num(form.max_asking_price),
    preferred_markets: form.preferred_markets.trim() || null,
    notes:            form.notes.trim() || null,
  }
}

function summaryLine(box: BuyBox): string {
  const parts: string[] = []
  if (box.min_cap_rate != null) parts.push(`Cap ≥ ${(box.min_cap_rate * 100).toFixed(1)}%`)
  if (box.max_ltv != null)      parts.push(`LTV ≤ ${(box.max_ltv * 100).toFixed(0)}%`)
  if (box.min_dscr != null)     parts.push(`DSCR ≥ ${box.min_dscr}x`)
  if (box.min_irr != null)      parts.push(`IRR ≥ ${(box.min_irr * 100).toFixed(0)}%`)
  return parts.length > 0 ? parts.join(' · ') : 'No thresholds set'
}

const FIELDS: { key: keyof FormState; label: string; placeholder: string; unit: string }[] = [
  { key: 'min_cap_rate',     label: 'Min Cap Rate',    placeholder: '5.5',    unit: '%'  },
  { key: 'max_ltv',          label: 'Max LTV',         placeholder: '75',     unit: '%'  },
  { key: 'min_dscr',         label: 'Min DSCR',        placeholder: '1.25',   unit: 'x'  },
  { key: 'min_occupancy',    label: 'Min Occupancy',   placeholder: '85',     unit: '%'  },
  { key: 'min_irr',          label: 'Target IRR',      placeholder: '12',     unit: '%'  },
  { key: 'max_asking_price', label: 'Max Price',       placeholder: '20000000', unit: '$' },
]

function BuyBoxRow({ box, onSaved }: { box: BuyBox; onSaved: (updated: BuyBox) => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(() => toForm(box))
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)

  function handleSave() {
    setSaveError(null)
    startTransition(async () => {
      const payload = toPayload(form)
      const result = await upsertBuyBox(box.asset_type, payload)
      if (result.error) {
        setSaveError(result.error)
      } else {
        onSaved({ ...box, ...payload, updated_at: new Date().toISOString() })
        setOpen(false)
      }
    })
  }

  function handleReset() {
    setForm(toForm(box))
    setSaveError(null)
    setOpen(false)
  }

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <p className="text-sm font-medium text-gray-900">{box.asset_type}</p>
          <p className="text-xs text-gray-400 mt-0.5">{summaryLine(box)}</p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-3 mt-3 sm:grid-cols-3">
            {FIELDS.map(({ key, label, placeholder, unit }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {label} {unit !== '$' ? `(${unit})` : '($)'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={form[key]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="input-base"
                />
              </div>
            ))}
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Preferred Markets</label>
            <input
              type="text"
              value={form.preferred_markets}
              onChange={e => setForm(prev => ({ ...prev, preferred_markets: e.target.value }))}
              placeholder="Austin TX, Nashville TN, Denver CO…"
              className="input-base"
            />
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Additional Criteria / Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any other investment criteria the AI should consider when scoring…"
              rows={2}
              className="input-base resize-none"
            />
          </div>

          {saveError && (
            <p className="text-xs text-red-600 mt-2">{saveError}</p>
          )}

          <div className="flex gap-2 justify-end mt-4">
            <button type="button" onClick={handleReset} className="btn-ghost text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BuyBoxSettings({ buyBoxes: initial }: Props) {
  // Ensure all asset types appear in canonical order, merging DB rows with defaults
  const [boxMap, setBoxMap] = useState<Map<string, BuyBox>>(() => {
    const m = new Map<string, BuyBox>()
    initial.forEach(b => m.set(b.asset_type, b))
    return m
  })

  const ordered = ASSET_TYPES.map(t => boxMap.get(t)).filter(Boolean) as BuyBox[]

  function handleSaved(updated: BuyBox) {
    setBoxMap(prev => new Map(prev).set(updated.asset_type, updated))
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 mb-1">Buy Box</h2>
      <p className="text-sm text-gray-500 mb-3">
        Set investment thresholds per asset type. The AI uses these when scoring deals — you can customize any value or add notes to refine how it judges each criterion.
      </p>
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
        {ordered.map(box => (
          <BuyBoxRow key={box.asset_type} box={box} onSaved={handleSaved} />
        ))}
      </div>
    </section>
  )
}
