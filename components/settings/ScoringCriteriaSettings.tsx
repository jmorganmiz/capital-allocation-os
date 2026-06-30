'use client'

import { useState, useTransition } from 'react'
import {
  createScoringCriteria,
  updateScoringCriteria,
  deleteScoringCriteria,
} from '@/lib/actions/scoring'

interface Criteria {
  id: string
  name: string
  description: string | null
  position: number
  is_active: boolean
}

export default function ScoringCriteriaSettings({ criteria: initial }: { criteria: Criteria[] }) {
  const [criteria, setCriteria] = useState(initial)
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!newName.trim()) return
    startTransition(async () => {
      const result = await createScoringCriteria(newName.trim(), criteria.length)
      if (result.criteria) {
        setCriteria(prev => [...prev, result.criteria as Criteria])
        setNewName('')
      }
    })
  }

  function handleRename(id: string) {
    if (!editName.trim()) return
    startTransition(async () => {
      await updateScoringCriteria(id, { name: editName.trim() })
      setCriteria(prev => prev.map(c => c.id === id ? { ...c, name: editName.trim() } : c))
      setEditId(null)
    })
  }

  function handleToggleActive(c: Criteria) {
    startTransition(async () => {
      await updateScoringCriteria(c.id, { is_active: !c.is_active })
      setCriteria(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x))
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this criteria? Existing scores for this criteria will also be removed.')) return
    startTransition(async () => {
      await deleteScoringCriteria(id)
      setCriteria(prev => prev.filter(c => c.id !== id))
    })
  }

  return (
    <section>
      <div className="app-settings-section-header">
        <div>
          <p>AI scoring</p>
          <h2>Scoring Criteria</h2>
        </div>
        <span>{criteria.filter(c => c.is_active).length} active</span>
      </div>
      <p className="app-settings-section-copy">
        Define what gets evaluated when underwriting a deal. Rate each 1-5 per deal.
      </p>

      <div className="app-settings-rule-list">
        {criteria.length === 0 && (
          <div className="app-settings-empty-row">No criteria yet. Add your first below.</div>
        )}
        {criteria.map((c, i) => (
          <div key={c.id} className="app-settings-rule-row" data-inactive={!c.is_active ? 'true' : 'false'}>
            {editId === c.id ? (
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="input-base"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleRename(c.id); if (e.key === 'Escape') setEditId(null) }}
              />
            ) : (
              <div className="app-settings-rule-main">
                <span>{i + 1}</span>
                <strong>{c.name}</strong>
                {!c.is_active && <em>hidden</em>}
              </div>
            )}
            <div className="app-settings-rule-actions">
              {editId === c.id ? (
                <>
                  <button onClick={() => handleRename(c.id)}>Save</button>
                  <button onClick={() => setEditId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditId(c.id); setEditName(c.name) }}>Rename</button>
                  <button onClick={() => handleToggleActive(c)}>{c.is_active ? 'Hide' : 'Show'}</button>
                  <button onClick={() => handleDelete(c.id)} data-danger="true">Delete</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="app-settings-add-row">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New criteria name..."
          className="input-base"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={isPending || !newName.trim()}
          className="btn-secondary disabled:opacity-50"
        >
          Add Criteria
        </button>
      </div>
    </section>
  )
}
