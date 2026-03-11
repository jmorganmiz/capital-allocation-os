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
      <h2 className="text-base font-semibold text-gray-900 mb-1">Scoring Criteria</h2>
      <p className="text-sm text-gray-500 mb-3">
        Define what gets evaluated when underwriting a deal. Rate each 1–5 per deal.
      </p>

      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
        {criteria.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            No criteria yet. Add your first below.
          </div>
        )}
        {criteria.map((c, i) => (
          <div key={c.id} className={`flex items-center justify-between px-4 py-3 ${!c.is_active ? 'opacity-50' : ''}`}>
            {editId === c.id ? (
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="input-base flex-1 mr-3"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleRename(c.id); if (e.key === 'Escape') setEditId(null) }}
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                <span className="text-sm text-gray-800">{c.name}</span>
                {!c.is_active && (
                  <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">hidden</span>
                )}
              </div>
            )}
            <div className="flex gap-3 items-center">
              {editId === c.id ? (
                <>
                  <button onClick={() => handleRename(c.id)} className="text-xs text-blue-600 hover:underline">Save</button>
                  <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setEditId(c.id); setEditName(c.name) }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleToggleActive(c)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {c.is_active ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New criteria name…"
          className="input-base flex-1"
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
