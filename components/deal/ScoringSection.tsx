'use client'

import { useCallback, useState } from 'react'
import { rescoreDeal, upsertDealScore } from '@/lib/actions/scoring'
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
  const vals = Object.values(scores).map((score) => score.score).filter(Boolean)
  if (vals.length === 0) return null
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.round(((avg - 1) / 4) * 100)
}

function scoreTone(score: number): 'green' | 'amber' | 'red' {
  if (score >= 70) return 'green'
  if (score >= 45) return 'amber'
  return 'red'
}

export default function ScoringSection({ dealId, criteria, initialScores }: Props) {
  const [scores, setScores] = useState<Record<string, DealScore>>(() => {
    const map: Record<string, DealScore> = {}
    initialScores.forEach((score) => {
      map[score.criteria_id] = score
    })
    return map
  })
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [rescoring, setRescoring] = useState(false)

  const activeCriteria = criteria.filter((criterion) => criterion.is_active)
  const overall = calcOverall(scores)
  const scoredCount = Object.keys(scores).length

  const handleScore = useCallback(async (criteriaId: string, score: number) => {
    const existing = scores[criteriaId]
    const notes = existing?.notes ?? null

    setScores((prev) => ({ ...prev, [criteriaId]: { criteria_id: criteriaId, score, notes, scored_by: null } }))
    setSaving((prev) => new Set(prev).add(criteriaId))

    const result = await upsertDealScore(dealId, criteriaId, score, notes)
    if (result.error) {
      setScores((prev) => {
        const next = { ...prev }
        if (existing) next[criteriaId] = existing
        else delete next[criteriaId]
        return next
      })
      showToast(result.error, 'error')
    }

    setSaving((prev) => {
      const next = new Set(prev)
      next.delete(criteriaId)
      return next
    })
  }, [dealId, scores])

  const handleNotes = useCallback(async (criteriaId: string, notes: string) => {
    const existing = scores[criteriaId]
    if (!existing?.score) return

    setScores((prev) => ({ ...prev, [criteriaId]: { ...prev[criteriaId], notes: notes || null } }))
    setSaving((prev) => new Set(prev).add(criteriaId))

    const result = await upsertDealScore(dealId, criteriaId, existing.score, notes || null)
    if (result.error) {
      setScores((prev) => ({ ...prev, [criteriaId]: existing }))
      showToast(result.error, 'error')
    }

    setSaving((prev) => {
      const next = new Set(prev)
      next.delete(criteriaId)
      return next
    })
  }, [dealId, scores])

  function toggleNotes(criteriaId: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(criteriaId)) next.delete(criteriaId)
      else next.add(criteriaId)
      return next
    })
  }

  async function handleRescore() {
    if (rescoring) return
    setRescoring(true)
    const result = await rescoreDeal(dealId)
    if (result.error) {
      showToast(result.error, 'error')
      setRescoring(false)
      return
    }
    showToast(`AI refreshed ${result.scoresWritten} criteria`, 'success')
    window.location.reload()
  }

  return (
    <>
      <div className="app-deal-section-header">
        <div>
          <p>AI underwriting</p>
          <h2>Scoring</h2>
        </div>
        <div className="app-deal-score-header-actions">
          <button type="button" className="app-deal-pill-button" onClick={handleRescore} disabled={rescoring}>
            {rescoring ? 'Re-scoring…' : 'Re-score with AI'}
          </button>
          {overall !== null && (
            <div className="app-deal-score-summary" data-tone={scoreTone(overall)}>
              <span>{scoredCount}/{activeCriteria.length} scored</span>
              <strong>{overall}</strong>
              <em>/100</em>
            </div>
          )}
        </div>
      </div>

      {overall !== null && (
        <div className="app-deal-score-bar">
          <span style={{ width: `${overall}%` }} data-tone={scoreTone(overall)} />
        </div>
      )}

      {activeCriteria.length === 0 ? (
        <div className="app-deal-empty">No scoring criteria configured. Add criteria in Settings.</div>
      ) : (
        <div className="app-deal-score-list">
          {activeCriteria.map((criterion) => {
            const current = scores[criterion.id]
            const isSaving = saving.has(criterion.id)
            const notesOpen = expandedNotes.has(criterion.id)

            return (
              <div key={criterion.id} className="app-deal-score-row">
                <div className="app-deal-score-row-main">
                  <div>
                    <strong>{criterion.name}</strong>
                    {current && !current.scored_by && <em>AI</em>}
                    {isSaving && <span>Saving...</span>}
                  </div>
                  {criterion.description && <p>{criterion.description}</p>}
                </div>

                <div className="app-deal-score-controls">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => handleScore(criterion.id, value)}
                      data-active={current?.score === value}
                      title={`Score ${value}`}
                    >
                      {value}
                    </button>
                  ))}
                  {current?.score && (
                    <button
                      onClick={() => toggleNotes(criterion.id)}
                      className="app-deal-note-toggle"
                      title="Toggle notes"
                    >
                      {notesOpen ? 'Hide' : 'Note'}
                    </button>
                  )}
                </div>

                {notesOpen && current?.score && (
                  <textarea
                    defaultValue={current.notes ?? ''}
                    onBlur={(event) => handleNotes(criterion.id, event.target.value)}
                    rows={2}
                    placeholder="Notes on this score..."
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {activeCriteria.length > 0 && overall === null && (
        <p className="app-deal-hint">Rate each criterion 1-5 to calculate the overall score.</p>
      )}
    </>
  )
}
