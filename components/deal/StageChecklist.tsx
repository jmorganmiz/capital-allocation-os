'use client'

import { useState, useTransition } from 'react'
import { StageChecklistItem } from '@/lib/types/database'
import { toggleChecklistItem } from '@/lib/actions/checklist'

interface Props {
  dealId: string
  stageName: string
  items: StageChecklistItem[]
  initialCompletedIds: string[]
}

export default function StageChecklist({ dealId, stageName, items, initialCompletedIds }: Props) {
  const [completedIds, setCompletedIds] = useState(new Set(initialCompletedIds))
  const [isPending, startTransition] = useTransition()

  if (items.length === 0) return null

  const completed = items.filter(i => completedIds.has(i.id)).length
  const total = items.length
  const allDone = completed === total
  const pct = Math.round((completed / total) * 100)

  function handleToggle(itemId: string) {
    const nowCompleted = !completedIds.has(itemId)
    setCompletedIds(prev => {
      const next = new Set(prev)
      if (nowCompleted) next.add(itemId)
      else next.delete(itemId)
      return next
    })
    startTransition(async () => {
      const result = await toggleChecklistItem(dealId, itemId, nowCompleted)
      if (result.error) {
        setCompletedIds(prev => {
          const next = new Set(prev)
          if (nowCompleted) next.delete(itemId)
          else next.add(itemId)
          return next
        })
      }
    })
  }

  return (
    <section id="section-checklist">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Stage Checklist</h2>
          <p style={{ fontSize: '11px', color: 'var(--lead)', marginTop: '2px' }}>{stageName}</p>
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 600,
          color: allDone ? '#4ade80' : 'var(--lead)',
          background: allDone ? 'rgba(34,197,94,0.1)' : 'rgba(112,112,125,0.1)',
          border: allDone ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(112,112,125,0.15)',
          borderRadius: '999px',
          padding: '3px 10px',
        }}>
          {completed} / {total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3 rounded-full overflow-hidden" style={{ height: '3px', background: 'rgba(112,112,125,0.15)' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: allDone ? '#4ade80' : 'var(--mercury-blue)',
          borderRadius: '999px',
          transition: 'width 0.3s ease',
        }} />
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(112,112,125,0.18)' }}>
        {items.map((item, i) => {
          const done = completedIds.has(item.id)
          return (
            <label
              key={item.id}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
              style={{
                borderTop: i > 0 ? '1px solid rgba(112,112,125,0.1)' : 'none',
                background: done ? 'rgba(34,197,94,0.04)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={done}
                onChange={() => handleToggle(item.id)}
                disabled={isPending}
                className="cursor-pointer"
                style={{ width: '15px', height: '15px', accentColor: 'var(--mercury-blue)', flexShrink: 0 }}
              />
              <span style={{
                fontSize: '13px',
                color: done ? 'var(--lead)' : 'var(--silver)',
                textDecoration: done ? 'line-through' : 'none',
                transition: 'color 0.15s',
              }}>
                {item.name}
              </span>
            </label>
          )
        })}
      </div>
    </section>
  )
}
