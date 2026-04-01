'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const STORAGE_KEY = 'demo_tour_step'

const STEPS = [
  {
    pages:    ['/demo'],
    target:   '[data-tour="board"]',
    title:    '1 of 4 — Your deal pipeline',
    body:     'This is your deal pipeline. Drag deals between stages as they progress.',
    position: 'below' as const,
  },
  {
    pages:    ['/demo'],
    target:   '[data-tour="deal-card"]',
    title:    '2 of 4 — Click a deal',
    body:     'Click any deal to open the full workspace — notes, financials, scoring, and more.',
    position: 'below' as const,
  },
  {
    pages:    ['/demo/deals/*'],
    target:   '[data-tour="notes"]',
    title:    '3 of 4 — Notes section',
    body:     'Add your overview, risks, and deal notes here. Everything auto-saves as you type.',
    position: 'below' as const,
  },
  {
    pages:    ['/demo'],
    target:   '[data-tour="kill-btn"]',
    title:    '4 of 4 — Kill a deal',
    body:     'When a deal dies, log exactly why. Over time this becomes your most valuable dataset.',
    position: 'above' as const,
  },
]

type Rect = { top: number; left: number; width: number; height: number }

function matchesPage(pages: string[], pathname: string) {
  return pages.some(p => {
    if (p.endsWith('/*')) return pathname.startsWith(p.slice(0, -2) + '/')
    return pathname === p
  })
}

export default function DemoTour() {
  const pathname = usePathname()
  const [step, setStep] = useState<number | null>(null)
  // null = still measuring, false = element not found / hidden (show tooltip only, no spotlight)
  const [rect, setRect] = useState<Rect | null | false>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retriesRef = useRef(0)
  const TOOLTIP_W = 288

  // Read from localStorage on first mount only
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'done') return
    const n = stored !== null ? parseInt(stored, 10) : 0
    if (!isNaN(n) && n < STEPS.length) setStep(n)
  }, [])

  function persist(n: number) {
    if (n >= STEPS.length) {
      localStorage.setItem(STORAGE_KEY, 'done')
      setStep(null)
    } else {
      localStorage.setItem(STORAGE_KEY, String(n))
      setStep(n)
    }
    setRect(null)
  }

  const currentStep = step !== null ? STEPS[step] : null
  const onRightPage = currentStep ? matchesPage(currentStep.pages, pathname) : false

  const measure = useCallback(() => {
    if (!currentStep || !onRightPage) return
    const el = document.querySelector(currentStep.target)
    if (el) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 || r.height > 0) {
        // Element is visible — use its rect for the spotlight
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
        retriesRef.current = 0
      } else {
        // Element exists but is hidden (e.g. display:none on this breakpoint)
        // Show tooltip without a spotlight rather than retrying forever
        setRect(false)
        retriesRef.current = 0
      }
    } else if (retriesRef.current < 8) {
      // Element not yet in DOM — retry a few times (handles async renders)
      retriesRef.current += 1
      retryRef.current = setTimeout(measure, 250)
    } else {
      // Give up — show tooltip without spotlight
      retriesRef.current = 0
      setRect(false)
    }
  }, [currentStep, onRightPage])

  useEffect(() => {
    if (retryRef.current) clearTimeout(retryRef.current)
    retriesRef.current = 0
    setRect(null)
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [measure, pathname])

  if (step === null) return null

  // Paused — user navigated to the wrong page for the current step
  if (!onRightPage) {
    let hint: string
    if (step === 2) hint = 'Click any deal to continue the tour →'
    else if (step === 3) hint = '← Back to Pipeline to continue the tour'
    else hint = `Tour paused — step ${step + 1} of ${STEPS.length}`

    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
        <div className="flex items-center gap-3 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap">
          <span className="text-gray-300">{hint}</span>
          <button
            onClick={() => persist(STEPS.length)}
            className="text-gray-500 hover:text-gray-200 transition-colors text-xs"
          >
            Skip
          </button>
        </div>
      </div>
    )
  }

  // Still measuring — render nothing yet
  if (rect === null) return null

  const vw = window.innerWidth
  const vh = window.innerHeight
  const isLast = step === STEPS.length - 1
  const isAbove = currentStep!.position === 'above'
  const PAD = 6
  const GAP = 14

  // When rect is `false` the element is hidden — centre tooltip on screen, no spotlight
  const hasSpotlight = rect !== false

  let ttLeft: number
  let ttTop: number
  let arrowLeft: number

  if (hasSpotlight) {
    ttLeft = Math.max(12, Math.min(vw - TOOLTIP_W - 12, rect.left + rect.width / 2 - TOOLTIP_W / 2))
    ttTop  = isAbove
      ? Math.max(12, rect.top - GAP - 130)
      : Math.min(vh - 160, rect.top + rect.height + GAP)
    arrowLeft = Math.min(Math.max(rect.left + rect.width / 2 - ttLeft - 6, 16), TOOLTIP_W - 28)
  } else {
    // Fallback: centre the card on screen
    ttLeft    = Math.max(12, vw / 2 - TOOLTIP_W / 2)
    ttTop     = vh / 2 - 80
    arrowLeft = TOOLTIP_W / 2 - 6
  }

  return (
    <>
      {/* Spotlight overlay — only when target is visible */}
      {hasSpotlight && (
        <div
          className="fixed pointer-events-none"
          style={{
            zIndex: 40,
            top:    rect.top    - PAD,
            left:   rect.left   - PAD,
            width:  rect.width  + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 8,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
            border: '2px solid rgba(255,255,255,0.25)',
          }}
        />
      )}

      {/* Dark scrim with no spotlight (hidden-element fallback) */}
      {!hasSpotlight && (
        <div className="fixed inset-0 bg-black/40 pointer-events-none" style={{ zIndex: 40 }} />
      )}

      {/* Tooltip card */}
      <div className="fixed pointer-events-auto" style={{ zIndex: 50, top: ttTop, left: ttLeft, width: TOOLTIP_W }}>
        {!isAbove && hasSpotlight && (
          <div className="absolute w-3 h-3 bg-gray-900 rotate-45" style={{ top: -6, left: arrowLeft }} />
        )}

        <div className="bg-gray-900 text-white rounded-xl shadow-2xl px-4 py-3.5">
          <p className="text-[11px] text-gray-400 font-medium mb-1">{currentStep!.title}</p>
          <p className="text-sm leading-relaxed text-gray-100 mb-4">{currentStep!.body}</p>
          <div className="flex items-center justify-between">
            <button
              onClick={() => persist(STEPS.length)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Skip tour
            </button>
            <button
              onClick={() => persist(step + 1)}
              className="bg-white text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              {isLast ? 'Got it — start exploring' : 'Next →'}
            </button>
          </div>
        </div>

        {isAbove && hasSpotlight && (
          <div className="absolute w-3 h-3 bg-gray-900 rotate-45" style={{ bottom: -6, left: arrowLeft }} />
        )}
      </div>
    </>
  )
}
