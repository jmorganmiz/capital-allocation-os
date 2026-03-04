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
      <h2 className="text-base font-semibold text-gray-900 mb-3">Kill Reasons</h2>
      <p className="text-sm text-gray-500 mb-3">Required when a deal is killed. Drives structured reporting.</p>
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
        {reasons.map((reason, i) => (
          <div key={reason.id} className="flex items-center justify-between px-4 py-3">
            {editId === reason.id ? (
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="input-base flex-1 mr-3"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                <span className="text-sm text-gray-800">{reason.name}</span>
              </div>
            )}
            <div className="flex gap-2">
              {editId === reason.id ? (
                <>
                  <button onClick={() => handleUpdate(reason.id)} className="text-xs text-blue-600 hover:underline">Save</button>
                  <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditId(reason.id); setEditName(reason.name) }} className="text-xs text-gray-500 hover:text-gray-700">Edit</button>
                  <button onClick={() => handleDelete(reason.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
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
          placeholder="New kill reason…"
          className="input-base flex-1"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} disabled={isPending || !newName.trim()} className="btn-secondary disabled:opacity-50">
          Add Reason
        </button>
      </div>
    </section>
  )
}
