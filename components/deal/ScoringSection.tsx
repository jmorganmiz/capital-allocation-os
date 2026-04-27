'use client'

import { useState, useCallback } from 'react'
import { upsertDealScore } from '@/lib/actions/scoring'

interface Criteria {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

interface DealScore {
  criteria_id: string
  score: number
  notes: string | null
  scored_by: string | null
}

interface Props {
  dealId: string
  criteria: Criteria[]
  initialScores: DealScore[]
}

function scoreToColor(pct: number): string {
  if (pct < 40) return 'text-red-600'
  if (pct < 70) return 'text-amber-500'
  return 'text-green-600'
}

function scoreToBg(pct: number): string {
  if (pct < 40) return 'bg-red-50 border-red-200'
  if (pct < 70) return 'bg-amber-50 border-amber-200'
  return 'bg-green-50 border-green-200'
}

function calcOverall(scores: Record<string, DealScore>): number | null {
  const vals = Object.values(scores).map(s => s.score).filter(Boolean)
  if (vals.length === 0) return null
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.round(((avg - 1) / 4) * 100)
}

export default function ScoringSection({ dealId, criteria, initialScores }: Props) {
  const [scores, setScores] = useState<Record<string, DealScore>>(() => {
    const map: Record<string, DealScore> = {}
    initialScores.forEach(s => { map[s.criteria_id] = s })
    return map
  })
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<Set<string>>(new Set())

  const activeCriteria = criteria.filter(c => c.is_active)
  const overall = calcOverall(scores)

  const handleScore = useCallback(async (criteriaId: string, score: number) => {
    const existing = scores[criteriaId]
    const notes = existing?.notes ?? null

    setScores(prev => ({
      ...prev,
      [criteriaId]: { criteria_id: criteriaId, score, notes, scored_by: null },
    }))

    setSaving(prev => new Set(prev).add(criteriaId))
    await upsertDealScore(dealId, criteriaId, score, notes)
    setSaving(prev => { const n = new Set(prev); n.delete(criteriaId); return n })
  }, [dealId, scores])

  const handleNotes = useCallback(async (criteriaId: string, notes: string) => {
    const existing = scores[criteriaId]
    if (!existing?.score) return // don't save notes without a score

    setScores(prev => ({
      ...prev,
      [criteriaId]: { ...prev[criteriaId], notes: notes || null },
    }))

    setSaving(prev => new Set(prev).add(criteriaId))
    await upsertDealScore(dealId, criteriaId, existing.score, notes || null)
    setSaving(prev => { const n = new Set(prev); n.delete(criteriaId); return n })
  }, [dealId, scores])

  function toggleNotes(criteriaId: string) {
    setExpandedNotes(prev => {
      const n = new Set(prev)
      if (n.has(criteriaId)) n.delete(criteriaId)
      else n.add(criteriaId)
      return n
    })
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Underwriting Score</h2>
        {overall !== null && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded border ${scoreToBg(overall)}`}>
            <span className={scoreToColor(overall)}>{overall}/100</span>
          </span>
        )}
      </div>

      {/* Overall score banner */}
      {overall !== null && (
        <div className={`rounded-lg border px-4 py-3 mb-4 flex items-center gap-4 ${scoreToBg(overall)}`}>
          <div>
            <p className={`text-3xl font-bold ${scoreToColor(overall)}`}>{overall}</p>
            <p className="text-xs text-gray-500 mt-0.5">out of 100</p>
          </div>
          <div className="flex-1">
            <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-gray-200">
              <div
                className={`h-full rounded-full transition-all ${
                  overall < 40 ? 'bg-red-500' : overall < 70 ? 'bg-amber-400' : 'bg-green-500'
                }`}
                style={{ width: `${overall}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {Object.keys(scores).length} of {activeCriteria.length} criteria scored
            </p>
          </div>
        </div>
      )}

      {activeCriteria.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400">
          No scoring criteria configured. Add criteria in Settings.
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
          {activeCriteria.map(c => {
            const current = scores[c.id]
            const isSaving = saving.has(c.id)
            const notesOpen = expandedNotes.has(c.id)

            return (
              <div key={c.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      {current?.scored_by === 'ai-auto' && (
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded leading-none">
                          AI
                        </span>
                      )}
                      {isSaving && <span className="text-xs text-gray-400">Saving…</span>}
                    </div>
                    {c.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>
                    )}
                  </div>

                  {/* 1-5 rating buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {[1, 2, 3, 4, 5].map(val => (
                      <button
                        key={val}
                        onClick={() => handleScore(c.id, val)}
                        className={`w-8 h-8 rounded text-sm font-medium border transition-colors ${
                          current?.score === val
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-700'
                        }`}
                        title={`Score ${val}`}
                      >
                        {val}
                      </button>
                    ))}
                    {current?.score && (
                      <button
                        onClick={() => toggleNotes(c.id)}
                        className="ml-1 text-xs text-gray-400 hover:text-gray-600"
                        title="Add notes"
                      >
                        {notesOpen ? '▲' : '▼'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline notes */}
                {notesOpen && current?.score && (
                  <div className="mt-2">
                    <textarea
                      defaultValue={current.notes ?? ''}
                      onBlur={e => handleNotes(c.id, e.target.value)}
                      rows={2}
                      className="input-base resize-none text-xs"
                      placeholder="Notes on this score…"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {activeCriteria.length > 0 && overall === null && (
        <p className="text-xs text-gray-400 mt-2">Rate each criterion 1–5 to calculate the overall score.</p>
      )}
    </section>
  )
}
