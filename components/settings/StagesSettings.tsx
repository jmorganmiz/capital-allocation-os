'use client'

import { useState, useTransition } from 'react'
import { DealStage } from '@/lib/types/database'
import { createDealStage, updateDealStage, deleteDealStage } from '@/lib/actions/settings'

export default function StagesSettings({ stages: initial }: { stages: DealStage[] }) {
  const [stages, setStages] = useState(initial)
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!newName.trim()) return
    startTransition(async () => {
      const result = await createDealStage(newName.trim(), stages.length)
      if (result.stage) {
        setStages(prev => [...prev, result.stage as DealStage])
        setNewName('')
      }
    })
  }

  function handleUpdate(id: string) {
    startTransition(async () => {
      await updateDealStage(id, { name: editName })
      setStages(prev => prev.map(s => s.id === id ? { ...s, name: editName } : s))
      setEditId(null)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteDealStage(id)
      setStages(prev => prev.filter(s => s.id !== id))
    })
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 mb-3">Pipeline Stages</h2>
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex items-center justify-between px-4 py-3">
            {editId === stage.id ? (
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="input-base flex-1 mr-3"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                <span className="text-sm text-gray-800">{stage.name}</span>
                {stage.is_terminal && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">terminal</span>
                )}
              </div>
            )}
            <div className="flex gap-2">
              {editId === stage.id ? (
                <>
                  <button onClick={() => handleUpdate(stage.id)} className="text-xs text-blue-600 hover:underline">Save</button>
                  <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditId(stage.id); setEditName(stage.name) }} className="text-xs text-gray-500 hover:text-gray-700">Edit</button>
                  <button onClick={() => handleDelete(stage.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
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
          placeholder="New stage name…"
          className="input-base flex-1"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} disabled={isPending || !newName.trim()} className="btn-secondary disabled:opacity-50">
          Add Stage
        </button>
      </div>
    </section>
  )
}
