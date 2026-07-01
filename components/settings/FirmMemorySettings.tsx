'use client'

import { useMemo, useState } from 'react'

type MemoryType = 'saved' | 'correction' | 'firm_rule'

type Memory = {
  id: string
  source_question: string | null
  content: string
  feedback_type: MemoryType
  tags: string[]
  created_at: string
  updated_at: string
}

const TYPE_LABELS: Record<MemoryType, string> = {
  saved: 'Saved memory',
  correction: 'Correction',
  firm_rule: 'Firm rule',
}

export default function FirmMemorySettings({ initialMemories }: { initialMemories: Memory[] }) {
  const [memories, setMemories] = useState(initialMemories)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const ruleCount = useMemo(() => memories.filter(memory => memory.feedback_type === 'firm_rule').length, [memories])
  const correctionCount = useMemo(() => memories.filter(memory => memory.feedback_type === 'correction').length, [memories])

  async function createRule() {
    const content = draft.trim()
    if (!content) return
    setBusyId('new')
    setStatus(null)
    try {
      const response = await fetch('/api/analyst/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, feedbackType: 'firm_rule' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not create rule.')
      setMemories(previous => [data.memory, ...previous])
      setDraft('')
      setStatus('Firm rule added. It will guide future analyst answers and automatic scoring.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not create rule.')
    } finally {
      setBusyId(null)
    }
  }

  async function updateMemory(memory: Memory, content: string, feedbackType: MemoryType) {
    const nextContent = content.trim()
    if (!nextContent) return
    setBusyId(memory.id)
    setStatus(null)
    try {
      const response = await fetch('/api/analyst/memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memory.id, content: nextContent, feedbackType }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not update memory.')
      setMemories(previous => previous.map(item => item.id === memory.id ? { ...item, ...data.memory } : item))
      setEditingId(null)
      setEditingContent('')
      setStatus(feedbackType === 'firm_rule' ? 'Promoted to firm rule. It now influences automatic scoring.' : 'Firm memory updated.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not update memory.')
    } finally {
      setBusyId(null)
    }
  }

  async function deleteMemory(memory: Memory) {
    if (!confirm('Delete this firm memory? This removes it from future AI answers and scoring.')) return
    setBusyId(memory.id)
    setStatus(null)
    try {
      const response = await fetch('/api/analyst/memory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memory.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not delete memory.')
      setMemories(previous => previous.filter(item => item.id !== memory.id))
      setStatus('Firm memory deleted.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not delete memory.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section>
      <div className="app-settings-section-header">
        <div>
          <p>Learning loop</p>
          <h2>Firm Memory</h2>
        </div>
        <span>{ruleCount} scoring {ruleCount === 1 ? 'rule' : 'rules'}</span>
      </div>
      <p className="app-settings-section-copy">
        Review what Dealstash has learned. Saved memories and corrections guide analyst answers; only approved firm rules influence automatic scoring.
      </p>

      <div className="app-memory-summary">
        <div><strong>{memories.length}</strong><span>Reusable memories</span></div>
        <div><strong>{correctionCount}</strong><span>Corrections</span></div>
        <div data-tone="blue"><strong>{ruleCount}</strong><span>Approved scoring rules</span></div>
      </div>

      <div className="app-memory-create">
        <div>
          <strong>Add a firm rule</strong>
          <span>Use plain language. Example: “For Dallas multifamily, cap rate below 5.75% should score no higher than 2.”</span>
        </div>
        <textarea
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder="Write an approved underwriting or decision rule..."
          rows={3}
        />
        <button onClick={createRule} disabled={!draft.trim() || busyId === 'new'}>Add firm rule</button>
      </div>

      {status && <p className="app-memory-status">{status}</p>}

      <div className="app-memory-list">
        {memories.length === 0 && <div className="app-settings-empty-row">No reusable firm memory yet.</div>}
        {memories.map(memory => (
          <article key={memory.id} className="app-memory-row" data-type={memory.feedback_type}>
            <div className="app-memory-meta">
              <span>{TYPE_LABELS[memory.feedback_type]}</span>
              <time dateTime={memory.updated_at}>{new Date(memory.updated_at).toLocaleDateString()}</time>
            </div>
            {editingId === memory.id ? (
              <textarea value={editingContent} onChange={event => setEditingContent(event.target.value)} rows={4} autoFocus />
            ) : (
              <p>{memory.content}</p>
            )}
            {memory.source_question && <small>Learned from: “{memory.source_question}”</small>}
            <div className="app-settings-rule-actions">
              {editingId === memory.id ? (
                <>
                  <button onClick={() => { setEditingId(null); setEditingContent('') }}>Cancel</button>
                  <button onClick={() => updateMemory(memory, editingContent, memory.feedback_type)} disabled={!editingContent.trim() || busyId === memory.id}>Save</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditingId(memory.id); setEditingContent(memory.content) }}>Edit</button>
                  {memory.feedback_type !== 'firm_rule' ? (
                    <button onClick={() => updateMemory(memory, memory.content, 'firm_rule')} disabled={busyId === memory.id}>Promote to rule</button>
                  ) : (
                    <button onClick={() => updateMemory(memory, memory.content, 'saved')} disabled={busyId === memory.id}>Remove from scoring</button>
                  )}
                  <button onClick={() => deleteMemory(memory)} disabled={busyId === memory.id} data-danger="true">Delete</button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
