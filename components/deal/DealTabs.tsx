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

// Walk up the DOM to find the nearest scrollable ancestor
function findScrollContainer(el: Element | null): Element | null {
  if (!el || el === document.documentElement) return null
  const { overflow, overflowY } = getComputedStyle(el)
  if (overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll') {
    return el
  }
  return findScrollContainer(el.parentElement)
}

export default function DealTabs() {
  const [active, setActive] = useState(TABS[0].id)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const containerRef = useRef<Element | null>(null)

  useEffect(() => {
    // Find the scroll container from the first section element
    const firstEl = document.getElementById(TABS[0].id)
    const container = findScrollContainer(firstEl ?? null)
    containerRef.current = container

    const targets = TABS.map(t => document.getElementById(t.id)).filter(Boolean) as HTMLElement[]

    observerRef.current = new IntersectionObserver(
      entries => {
        // Pick the topmost currently-visible section
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActive(visible[0].target.id)
      },
      {
        root: container ?? null,
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      }
    )

    targets.forEach(el => observerRef.current!.observe(el))
    return () => observerRef.current?.disconnect()
  }, [])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    const OFFSET = 80 // clears sticky tab bar + header
    const container = containerRef.current

    if (container) {
      const top = container.scrollTop + el.getBoundingClientRect().top - container.getBoundingClientRect().top - OFFSET
      container.scrollTo({ top, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - OFFSET, behavior: 'smooth' })
    }
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
