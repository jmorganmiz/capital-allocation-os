'use client'

import { useState, useTransition } from 'react'
import { DealStage, StageChecklistItem } from '@/lib/types/database'
import { createDealStage, updateDealStage, deleteDealStage } from '@/lib/actions/settings'
import {
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  reorderChecklistItems,
} from '@/lib/actions/checklist'

interface Props {
  stages: DealStage[]
  checklistItems: StageChecklistItem[]
}

export default function StagesSettings({ stages: initial, checklistItems: initialItems }: Props) {
  const [stages, setStages] = useState(initial)
  const [items, setItems] = useState(initialItems)
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [editItemName, setEditItemName] = useState('')
  const [isPending, startTransition] = useTransition()

  // ── Stage handlers ──────────────────────────────────────────────────────────

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
      setItems(prev => prev.filter(i => i.stage_id !== id))
      if (expandedStageId === id) setExpandedStageId(null)
    })
  }

  // ── Checklist item handlers ─────────────────────────────────────────────────

  function itemsForStage(stageId: string) {
    return items.filter(i => i.stage_id === stageId).sort((a, b) => a.position - b.position)
  }

  function handleAddItem(stageId: string) {
    if (!newItemName.trim()) return
    const position = itemsForStage(stageId).length
    startTransition(async () => {
      const result = await createChecklistItem(stageId, newItemName.trim(), position)
      if (result.item) {
        setItems(prev => [...prev, result.item as StageChecklistItem])
        setNewItemName('')
      }
    })
  }

  function handleUpdateItem(id: string) {
    startTransition(async () => {
      await updateChecklistItem(id, { name: editItemName })
      setItems(prev => prev.map(i => i.id === id ? { ...i, name: editItemName } : i))
      setEditItemId(null)
    })
  }

  function handleDeleteItem(id: string) {
    startTransition(async () => {
      await deleteChecklistItem(id)
      setItems(prev => prev.filter(i => i.id !== id))
    })
  }

  function handleMoveItem(id: string, stageId: string, direction: 'up' | 'down') {
    const stageItems = itemsForStage(stageId)
    const idx = stageItems.findIndex(i => i.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === stageItems.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const updated = stageItems.map((item, i) => {
      if (i === idx) return { ...item, position: stageItems[swapIdx].position }
      if (i === swapIdx) return { ...item, position: stageItems[idx].position }
      return item
    })

    setItems(prev => [
      ...prev.filter(i => i.stage_id !== stageId),
      ...updated,
    ])

    startTransition(async () => {
      await reorderChecklistItems(updated.map(i => ({ id: i.id, position: i.position })))
    })
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 mb-3">Pipeline Stages</h2>
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
        {stages.map((stage, i) => {
          const stageItems = itemsForStage(stage.id)
          const isExpanded = expandedStageId === stage.id

          return (
            <div key={stage.id}>
              {/* Stage row */}
              <div className="flex items-center justify-between px-4 py-3">
                {editId === stage.id ? (
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUpdate(stage.id)}
                    className="input-base flex-1 mr-3"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                    <span className="text-sm text-gray-800">{stage.name}</span>
                    {stage.is_terminal && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">terminal</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {/* Checklist toggle */}
                  {editId !== stage.id && (
                    <button
                      onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-100"
                    >
                      {stageItems.length > 0
                        ? `Checklist (${stageItems.length})`
                        : '+ Checklist'}
                    </button>
                  )}
                  {editId === stage.id ? (
                    <>
                      <button onClick={() => handleUpdate(stage.id)} className="text-xs text-blue-600 hover:underline">Save</button>
                      <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditId(stage.id); setEditName(stage.name) }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >Edit</button>
                      <button
                        onClick={() => handleDelete(stage.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >Delete</button>
                    </>
                  )}
                </div>
              </div>

              {/* Checklist sub-panel */}
              {isExpanded && (
                <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 space-y-2">
                  {stageItems.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No checklist items yet.</p>
                  )}
                  {stageItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="text-xs text-gray-300 w-4">{idx + 1}.</span>
                      {editItemId === item.id ? (
                        <input
                          value={editItemName}
                          onChange={e => setEditItemName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleUpdateItem(item.id)}
                          className="input-base flex-1 text-xs py-1"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm text-gray-700 flex-1">{item.name}</span>
                      )}
                      <div className="flex items-center gap-1">
                        {editItemId === item.id ? (
                          <>
                            <button onClick={() => handleUpdateItem(item.id)} className="text-xs text-blue-600 hover:underline">Save</button>
                            <button onClick={() => setEditItemId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleMoveItem(item.id, stage.id, 'up')}
                              disabled={idx === 0}
                              className="text-xs text-gray-300 hover:text-gray-500 disabled:opacity-30 px-0.5"
                              aria-label="Move up"
                            >↑</button>
                            <button
                              onClick={() => handleMoveItem(item.id, stage.id, 'down')}
                              disabled={idx === stageItems.length - 1}
                              className="text-xs text-gray-300 hover:text-gray-500 disabled:opacity-30 px-0.5"
                              aria-label="Move down"
                            >↓</button>
                            <button
                              onClick={() => { setEditItemId(item.id); setEditItemName(item.name) }}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >Edit</button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add item row */}
                  <div className="flex gap-2 pt-1">
                    <input
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddItem(stage.id)}
                      placeholder="Add checklist item…"
                      className="input-base flex-1 text-xs py-1"
                    />
                    <button
                      onClick={() => handleAddItem(stage.id)}
                      disabled={isPending || !newItemName.trim()}
                      className="btn-secondary text-xs py-1 px-3 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add stage row */}
      <div className="flex gap-2 mt-3">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New stage name…"
          className="input-base flex-1"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={isPending || !newName.trim()}
          className="btn-secondary disabled:opacity-50"
        >
          Add Stage
        </button>
      </div>
    </section>
  )
}
