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

  function handleToggle(itemId: string) {
    const nowCompleted = !completedIds.has(itemId)
    // Optimistic update
    setCompletedIds(prev => {
      const next = new Set(prev)
      if (nowCompleted) next.add(itemId)
      else next.delete(itemId)
      return next
    })
    startTransition(async () => {
      const result = await toggleChecklistItem(dealId, itemId, nowCompleted)
      if (result.error) {
        // Revert on failure
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
          <h2 className="text-sm font-semibold text-gray-900">Stage Checklist</h2>
          <p className="text-xs text-gray-400 mt-0.5">{stageName}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          allDone
            ? 'bg-green-50 text-green-700'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {completed} of {total} complete
        </span>
      </div>

      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
        {items.map(item => {
          const done = completedIds.has(item.id)
          return (
            <label
              key={item.id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                ${done ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
            >
              <input
                type="checkbox"
                checked={done}
                onChange={() => handleToggle(item.id)}
                disabled={isPending}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {item.name}
              </span>
            </label>
          )
        })}
      </div>
    </section>
  )
}
