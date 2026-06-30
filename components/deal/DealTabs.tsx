'use client'

import { useEffect, useRef, useState } from 'react'

const TABS = [
  { label: 'Financials', id: 'section-financials' },
  { label: 'Scoring', id: 'section-scoring' },
  { label: 'Notes', id: 'section-notes' },
  { label: 'Files', id: 'section-files' },
  { label: 'Contacts', id: 'section-contacts' },
  { label: 'Activity', id: 'section-activity' },
  { label: 'Similar', id: 'section-similar' },
]

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
    const firstEl = document.getElementById(TABS[0].id)
    const container = findScrollContainer(firstEl ?? null)
    containerRef.current = container

    const targets = TABS.map((tab) => document.getElementById(tab.id)).filter(Boolean) as HTMLElement[]

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActive(visible[0].target.id)
      },
      {
        root: container ?? null,
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      },
    )

    targets.forEach((el) => observerRef.current?.observe(el))
    return () => observerRef.current?.disconnect()
  }, [])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    const offset = 88
    const container = containerRef.current

    if (container) {
      const top = container.scrollTop + el.getBoundingClientRect().top - container.getBoundingClientRect().top - offset
      container.scrollTo({ top, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' })
    }
    setActive(id)
  }

  return (
    <nav className="app-deal-tabs" aria-label="Deal sections">
      <div>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => scrollTo(tab.id)}
            data-active={active === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
