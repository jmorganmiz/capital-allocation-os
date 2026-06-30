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
      <div className="app-settings-section-header">
        <div>
          <p>Workflow rules</p>
          <h2>Pipeline Stages</h2>
        </div>
        <span>{stages.length} stages</span>
      </div>
      <p className="app-settings-section-copy">Define how deals move through your firm workflow.</p>

      <div className="app-settings-rule-list">
        {stages.map((stage, i) => {
          const stageItems = itemsForStage(stage.id)
          const isExpanded = expandedStageId === stage.id

          return (
            <div key={stage.id} className="app-settings-stage-block">
              <div className="app-settings-rule-row">
                {editId === stage.id ? (
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUpdate(stage.id)}
                    className="input-base"
                    autoFocus
                  />
                ) : (
                  <div className="app-settings-rule-main">
                    <span>{i + 1}</span>
                    <strong>{stage.name}</strong>
                    {stage.is_terminal && <em>terminal</em>}
                  </div>
                )}

                <div className="app-settings-rule-actions">
                  {editId !== stage.id && (
                    <button onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}>
                      {stageItems.length > 0 ? `Checklist (${stageItems.length})` : '+ Checklist'}
                    </button>
                  )}
                  {editId === stage.id ? (
                    <>
                      <button onClick={() => handleUpdate(stage.id)}>Save</button>
                      <button onClick={() => setEditId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditId(stage.id); setEditName(stage.name) }}>Edit</button>
                      <button onClick={() => handleDelete(stage.id)} data-danger="true">Delete</button>
                    </>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="app-settings-checklist-panel">
                  {stageItems.length === 0 && (
                    <p className="app-settings-empty-row">No checklist items yet.</p>
                  )}
                  {stageItems.map((item, idx) => (
                    <div key={item.id} className="app-settings-checklist-row">
                      <span>{idx + 1}</span>
                      {editItemId === item.id ? (
                        <input
                          value={editItemName}
                          onChange={e => setEditItemName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleUpdateItem(item.id)}
                          className="input-base"
                          autoFocus
                        />
                      ) : (
                        <strong>{item.name}</strong>
                      )}
                      <div className="app-settings-rule-actions">
                        {editItemId === item.id ? (
                          <>
                            <button onClick={() => handleUpdateItem(item.id)}>Save</button>
                            <button onClick={() => setEditItemId(null)}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleMoveItem(item.id, stage.id, 'up')} disabled={idx === 0} aria-label="Move up">↑</button>
                            <button onClick={() => handleMoveItem(item.id, stage.id, 'down')} disabled={idx === stageItems.length - 1} aria-label="Move down">↓</button>
                            <button onClick={() => { setEditItemId(item.id); setEditItemName(item.name) }}>Edit</button>
                            <button onClick={() => handleDeleteItem(item.id)} data-danger="true">Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="app-settings-add-row compact">
                    <input
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddItem(stage.id)}
                      placeholder="Add checklist item..."
                      className="input-base"
                    />
                    <button onClick={() => handleAddItem(stage.id)} disabled={isPending || !newItemName.trim()} className="btn-secondary disabled:opacity-50">
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="app-settings-add-row">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New stage name..."
          className="input-base"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} disabled={isPending || !newName.trim()} className="btn-secondary disabled:opacity-50">
          Add Stage
        </button>
      </div>
    </section>
  )
}
