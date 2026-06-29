'use client'

import { useState, useCallback } from 'react'
import { upsertDealScore } from '@/lib/actions/scoring'
import { showToast } from '@/lib/toast'

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

function calcOverall(scores: Record<string, DealScore>): number | null {
  const vals = Object.values(scores).map(s => s.score).filter(Boolean)
  if (vals.length === 0) return null
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.round(((avg - 1) / 4) * 100)
}

function scoreColor(score: number): string {
  if (score >= 70) return '#4ade80'
  if (score >= 45) return '#fbbf24'
  return '#f87171'
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
  const scoredCount = Object.keys(scores).length

  const handleScore = useCallback(async (criteriaId: string, score: number) => {
    const existing = scores[criteriaId]
    const notes = existing?.notes ?? null
    setScores(prev => ({ ...prev, [criteriaId]: { criteria_id: criteriaId, score, notes, scored_by: null } }))
    setSaving(prev => new Set(prev).add(criteriaId))
    const result = await upsertDealScore(dealId, criteriaId, score, notes)
    if (result.error) {
      setScores(prev => {
        const next = { ...prev }
        if (existing) next[criteriaId] = existing
        else delete next[criteriaId]
        return next
      })
      showToast(result.error, 'error')
    }
    setSaving(prev => { const n = new Set(prev); n.delete(criteriaId); return n })
  }, [dealId, scores])

  const handleNotes = useCallback(async (criteriaId: string, notes: string) => {
    const existing = scores[criteriaId]
    if (!existing?.score) return
    setScores(prev => ({ ...prev, [criteriaId]: { ...prev[criteriaId], notes: notes || null } }))
    setSaving(prev => new Set(prev).add(criteriaId))
    const result = await upsertDealScore(dealId, criteriaId, existing.score, notes || null)
    if (result.error) {
      setScores(prev => ({ ...prev, [criteriaId]: existing }))
      showToast(result.error, 'error')
    }
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
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--lead)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scoring</h2>
        {overall !== null && (
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '11px', color: 'var(--lead)' }}>{scoredCount}/{activeCriteria.length} scored</span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: scoreColor(overall), lineHeight: 1 }}>{overall}</span>
            <span style={{ fontSize: '11px', color: 'var(--lead)' }}>/ 100</span>
          </div>
        )}
      </div>

      {overall !== null && (
        <div className="mb-4 rounded-lg overflow-hidden" style={{ height: '4px', background: 'rgba(112,112,125,0.15)' }}>
          <div style={{ width: `${overall}%`, height: '100%', background: scoreColor(overall), borderRadius: '999px', transition: 'width 0.4s ease' }} />
        </div>
      )}

      {activeCriteria.length === 0 ? (
        <div className="rounded-lg p-8 text-center" style={{ border: '1px dashed rgba(112,112,125,0.25)' }}>
          <p style={{ fontSize: '13px', color: 'var(--lead)' }}>No scoring criteria configured. Add criteria in Settings.</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(112,112,125,0.18)' }}>
          {activeCriteria.map((c, i) => {
            const current = scores[c.id]
            const isSaving = saving.has(c.id)
            const notesOpen = expandedNotes.has(c.id)

            return (
              <div
                key={c.id}
                style={{
                  borderTop: i > 0 ? '1px solid rgba(112,112,125,0.12)' : 'none',
                  padding: '14px 18px',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--starlight)' }}>{c.name}</p>
                      {current?.scored_by === 'ai-auto' && (
                        <span style={{
                          fontSize: '10px', fontWeight: 700,
                          color: 'var(--ghost-blue)',
                          background: 'rgba(82,102,235,0.12)',
                          border: '1px solid rgba(82,102,235,0.25)',
                          borderRadius: '4px',
                          padding: '1px 5px',
                          letterSpacing: '0.04em',
                        }}>AI</span>
                      )}
                      {isSaving && <span style={{ fontSize: '11px', color: 'var(--lead)' }}>Saving…</span>}
                    </div>
                    {c.description && (
                      <p style={{ fontSize: '12px', color: 'var(--lead)', marginTop: '2px' }}>{c.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {[1, 2, 3, 4, 5].map(val => {
                      const isSelected = current?.score === val
                      return (
                        <button
                          key={val}
                          onClick={() => handleScore(c.id, val)}
                          style={{
                            width: '30px', height: '30px',
                            borderRadius: '6px',
                            fontSize: '12px', fontWeight: 600,
                            border: isSelected ? '1px solid var(--mercury-blue)' : '1px solid rgba(112,112,125,0.2)',
                            background: isSelected ? 'var(--mercury-blue)' : 'transparent',
                            color: isSelected ? '#fff' : 'var(--lead)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                          title={`Score ${val}`}
                        >
                          {val}
                        </button>
                      )
                    })}
                    {current?.score && (
                      <button
                        onClick={() => toggleNotes(c.id)}
                        style={{ marginLeft: '4px', fontSize: '11px', color: 'var(--lead)', cursor: 'pointer', background: 'none', border: 'none' }}
                        className="hover:opacity-70 transition-opacity"
                        title="Toggle notes"
                      >
                        {notesOpen ? '▲' : '▼'}
                      </button>
                    )}
                  </div>
                </div>

                {notesOpen && current?.score && (
                  <div className="mt-2">
                    <textarea
                      defaultValue={current.notes ?? ''}
                      onBlur={e => handleNotes(c.id, e.target.value)}
                      rows={2}
                      className="input-base resize-none w-full"
                      style={{ fontSize: '12px' }}
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
        <p style={{ fontSize: '11px', color: 'var(--lead)', marginTop: '10px' }}>Rate each criterion 1–5 to calculate the overall score.</p>
      )}
    </section>
  )
}
