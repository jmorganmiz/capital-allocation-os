'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { upsertDealNote } from '@/lib/actions/deals'
import DecisionWritingCopilot from '@/components/deal/DecisionWritingCopilot'

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
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const contentRef = useRef(initialContent)
  const lastSavedRef = useRef(initialContent)
  const activeDraftIdRef = useRef<string | undefined>(undefined)

  const save = useCallback((value: string) => {
    clearTimeout(debounceRef.current)
    if (value === lastSavedRef.current) {
      setSaved(true)
      return
    }
    setError('')
    startTransition(async () => {
      const result = await upsertDealNote(dealId, section, value, activeDraftIdRef.current)
      if (result.error) {
        setError(result.error)
        setSaved(false)
        return
      }
      lastSavedRef.current = value
      setSaved(contentRef.current === value)
    })
  }, [dealId, section])

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (saved || isPending) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [isPending, saved])

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  function handleChange(value: string) {
    setContent(value)
    contentRef.current = value
    setSaved(false)
    setError('')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(value), 1500)
  }

  function handleDraftInsert(value: string, draftId: string) {
    activeDraftIdRef.current = draftId
    handleChange(value)
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
        <div className="app-deal-note-actions" aria-live="polite">
          {(section === 'overview' || section === 'risks') && (
            <DecisionWritingCopilot dealId={dealId} section={section} currentText={content} onInsert={handleDraftInsert} />
          )}
          <span data-error={Boolean(error)}>{isPending ? 'Saving...' : error ? `Save failed: ${error}` : saved ? 'Saved' : 'Unsaved'}</span>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => save(content)}
            disabled={saved || isPending}
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={() => save(content)}
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
