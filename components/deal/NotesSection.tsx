'use client'

import { useState, useTransition, useCallback, useRef } from 'react'
import { upsertDealNote } from '@/lib/actions/deals'

interface Props {
  dealId: string
  section: 'overview' | 'risks' | 'notes'
  title: string
  initialContent: string
  placeholder?: string
}

export default function NotesSection({ dealId, section, title, initialContent, placeholder }: Props) {
  const [content, setContent] = useState(initialContent)
  const [saved, setSaved] = useState(true)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const save = useCallback((value: string) => {
    startTransition(async () => {
      const result = await upsertDealNote(dealId, section, value)
      if (!result.error) setSaved(true)
    })
  }, [dealId, section])

  function handleChange(value: string) {
    setContent(value)
    setSaved(false)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(value), 1500)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <span className={`text-xs transition-opacity ${saved ? 'text-gray-400' : 'text-amber-500'}`}>
          {isPending ? 'Saving…' : saved ? 'Saved' : 'Unsaved changes'}
        </span>
      </div>
      <textarea
        value={content}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder ?? `Add ${title.toLowerCase()}…`}
        rows={6}
        className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-800
                   focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y
                   placeholder:text-gray-400 font-mono leading-relaxed"
      />
    </section>
  )
}
