'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { searchDeals } from '@/lib/actions/deals'

interface Result {
  id: string
  title: string
  market: string | null
  stage_name: string | null
}

interface Props {
  onClose: () => void
}

export default function SearchModal({ onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    startTransition(async () => {
      const res = await searchDeals(query.trim())
      if (res.deals) {
        setResults(res.deals as Result[])
        setActiveIndex(0)
      }
    })
  }, [query])

  function navigate(id: string) {
    router.push(`/deals/${id}`)
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      navigate(results[activeIndex].id)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 pt-[15vh]" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search deals…"
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
          />
          {isPending && (
            <span className="text-xs text-gray-400">Searching…</span>
          )}
          <kbd className="text-xs text-gray-300 border border-gray-200 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {results.length > 0 && (
          <ul className="py-1 max-h-80 overflow-y-auto">
            {results.map((deal, i) => (
              <li key={deal.id}>
                <button
                  onClick={() => navigate(deal.id)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors
                    ${i === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <span className="text-sm font-medium text-gray-900 truncate">{deal.title}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {deal.market && (
                      <span className="text-xs text-gray-400">{deal.market}</span>
                    )}
                    {deal.stage_name && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        {deal.stage_name}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {query.trim() && !isPending && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            No deals found for "{query}"
          </div>
        )}

        {!query.trim() && (
          <div className="px-4 py-3 text-xs text-gray-400 flex items-center justify-between">
            <span>Search by deal name, market, or source</span>
            <div className="flex items-center gap-1">
              <kbd className="border border-gray-200 rounded px-1.5 py-0.5">↑↓</kbd>
              <span>navigate</span>
              <kbd className="border border-gray-200 rounded px-1.5 py-0.5 ml-2">↵</kbd>
              <span>open</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
