'use client'

import { useState, useTransition, useCallback, useRef } from 'react'
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

  const isEmpty = highlight && !content.trim()

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {title}
          {isEmpty && (
            <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 400, color: 'var(--mercury-blue)', textTransform: 'none', letterSpacing: 0 }}>
              — start here
            </span>
          )}
        </h2>
        <span style={{
          fontSize: '11px',
          color: isPending ? 'var(--amber)' : saved ? 'var(--lead)' : 'var(--amber)',
          transition: 'color 0.2s',
        }}>
          {isPending ? 'Saving…' : saved ? '' : 'Unsaved'}
        </span>
      </div>
      <textarea
        value={content}
        onChange={e => handleChange(e.target.value)}
        placeholder={
          isEmpty
            ? `What's the opportunity? Describe the asset, location, and thesis…`
            : (placeholder ?? `Add ${title.toLowerCase()}…`)
        }
        rows={6}
        style={{
          width: '100%',
          background: isEmpty ? 'rgba(82,102,235,0.06)' : 'var(--midnight-slate)',
          border: isEmpty
            ? '1px dashed rgba(82,102,235,0.4)'
            : '1px solid rgba(112,112,125,0.18)',
          borderRadius: '8px',
          padding: '12px 14px',
          fontSize: '13px',
          lineHeight: 1.7,
          color: 'var(--silver)',
          resize: 'vertical',
          outline: 'none',
          fontFamily: 'inherit',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(82,102,235,0.4)' }}
        onBlur={e => { e.currentTarget.style.borderColor = isEmpty ? 'rgba(82,102,235,0.4)' : 'rgba(112,112,125,0.18)' }}
      />
    </section>
  )
}
