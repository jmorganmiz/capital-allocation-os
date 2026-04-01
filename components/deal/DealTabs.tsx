'use client'

import { useEffect, useRef, useState } from 'react'

const TABS = [
  { label: 'Notes',      id: 'section-notes'      },
  { label: 'Financials', id: 'section-financials'  },
  { label: 'Scoring',    id: 'section-scoring'     },
  { label: 'Files',      id: 'section-files'       },
  { label: 'Contacts',   id: 'section-contacts'    },
  { label: 'Activity',   id: 'section-activity'    },
]

export default function DealTabs() {
  const [active, setActive] = useState(TABS[0].id)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const targets = TABS.map(t => document.getElementById(t.id)).filter(Boolean) as HTMLElement[]

    observerRef.current = new IntersectionObserver(
      entries => {
        // Pick the topmost visible section
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActive(visible[0].target.id)
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    )

    targets.forEach(el => observerRef.current!.observe(el))
    return () => observerRef.current?.disconnect()
  }, [])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    const offset = 80 // account for sticky header + tab bar height
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })
    setActive(id)
  }

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-100 -mx-6 px-6 mb-8">
      <div className="flex gap-0 overflow-x-auto scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => scrollTo(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
              ${active === tab.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
