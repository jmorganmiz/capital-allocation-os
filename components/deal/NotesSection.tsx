'use client'

import { useCallback, useRef, useState, useTransition } from 'react'
import { upsertDealNote } from '@/lib/actions/deals'

interface Props {
  dealId: string
  section: 'overview' | 'risks' | 'notes'
  title: string
  initialContent: string
  placeholder?: string
  highlight?: boolean
}

export default function NotesSection({ dealId, section, title, initialContent, placeholder, highlight }: Props) {
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

  const isEmpty = Boolean(highlight && !content.trim())

  return (
    <section className="app-deal-note-card" data-highlight={isEmpty}>
      <div className="app-deal-section-header compact">
        <div>
          <p>{section === 'overview' ? 'Thesis' : section}</p>
          <h2>
            {title}
            {isEmpty && <span>Start here</span>}
          </h2>
        </div>
        <span>{isPending ? 'Saving...' : saved ? '' : 'Unsaved'}</span>
      </div>

      <textarea
        value={content}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={
          isEmpty
            ? `What's the opportunity? Describe the asset, location, and thesis...`
            : (placeholder ?? `Add ${title.toLowerCase()}...`)
        }
        rows={6}
      />
    </section>
  )
}
