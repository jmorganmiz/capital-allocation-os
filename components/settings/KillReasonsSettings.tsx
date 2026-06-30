'use client'

import { useState, useTransition } from 'react'
import { KillReason } from '@/lib/types/database'
import { createKillReason, updateKillReason, deleteKillReason } from '@/lib/actions/settings'

export default function KillReasonsSettings({ killReasons: initial }: { killReasons: KillReason[] }) {
  const [reasons, setReasons] = useState(initial)
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!newName.trim()) return
    startTransition(async () => {
      const result = await createKillReason(newName.trim(), reasons.length)
      if (result.reason) {
        setReasons(prev => [...prev, result.reason as KillReason])
        setNewName('')
      }
    })
  }

  function handleUpdate(id: string) {
    startTransition(async () => {
      await updateKillReason(id, { name: editName })
      setReasons(prev => prev.map(r => r.id === id ? { ...r, name: editName } : r))
      setEditId(null)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteKillReason(id)
      setReasons(prev => prev.filter(r => r.id !== id))
    })
  }

  return (
    <section>
      <div className="app-settings-section-header">
        <div>
          <p>Decision memory</p>
          <h2>Kill Reasons</h2>
        </div>
        <span>{reasons.length} reasons</span>
      </div>
      <p className="app-settings-section-copy">Required when a deal is killed. Drives structured reporting and future recall.</p>

      <div className="app-settings-rule-list">
        {reasons.map((reason, i) => (
          <div key={reason.id} className="app-settings-rule-row">
            {editId === reason.id ? (
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="input-base"
                autoFocus
              />
            ) : (
              <div className="app-settings-rule-main">
                <span>{i + 1}</span>
                <strong>{reason.name}</strong>
              </div>
            )}
            <div className="app-settings-rule-actions">
              {editId === reason.id ? (
                <>
                  <button onClick={() => handleUpdate(reason.id)}>Save</button>
                  <button onClick={() => setEditId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditId(reason.id); setEditName(reason.name) }}>Edit</button>
                  <button onClick={() => handleDelete(reason.id)} data-danger="true">Delete</button>
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
          placeholder="New kill reason..."
          className="input-base"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} disabled={isPending || !newName.trim()} className="btn-secondary disabled:opacity-50">
          Add Reason
        </button>
      </div>
    </section>
  )
}
