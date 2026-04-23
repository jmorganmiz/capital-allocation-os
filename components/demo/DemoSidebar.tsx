'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import DemoImportWizard from './DemoImportWizard'

const NAV_BEFORE_IMPORT = [
  { href: '/demo', label: 'Pipeline' },
]

const NAV_AFTER_IMPORT = [
  { href: '/demo/dashboard', label: 'Dashboard' },
  { href: '/demo/graveyard', label: 'Graveyard' },
  { href: '/signup',         label: 'Contacts ↗' },
  { href: '/signup',         label: 'Settings ↗' },
]

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
    </svg>
  )
}

function HamburgerIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

const linkClass = (active: boolean) =>
  `block px-3 py-2 rounded-md text-sm transition-colors ${
    active
      ? 'bg-gray-100 text-gray-900 font-medium'
      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
  }`

function NavLinks({
  pathname,
  onImportDeals,
  onClick,
}: {
  pathname: string
  onImportDeals: () => void
  onClick?: () => void
}) {
  return (
    <>
      {NAV_BEFORE_IMPORT.map(({ href, label }) => (
        <Link key={label} href={href} onClick={onClick} className={linkClass(pathname === href)}>
          {label}
        </Link>
      ))}

      <button
        onClick={() => { onClick?.(); onImportDeals() }}
        className={linkClass(false) + ' w-full text-left'}
      >
        Import Deals
      </button>

      {NAV_AFTER_IMPORT.map(({ href, label }) => (
        <Link key={label} href={href} onClick={onClick} className={linkClass(pathname === href)}>
          {label}
        </Link>
      ))}
    </>
  )
}

export default function DemoSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showImportWizard, setShowImportWizard] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
      if (e.key === 'Escape') {
        closeSearch()
        setDrawerOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (showSearch) inputRef.current?.focus()
  }, [showSearch])

  useEffect(() => { setDrawerOpen(false) }, [pathname])

  function closeSearch() {
    setShowSearch(false)
    setQuery('')
    router.replace('/demo', { scroll: false })
  }

  function handleChange(value: string) {
    setQuery(value)
    const url = value ? `/demo?q=${encodeURIComponent(value)}` : '/demo'
    router.replace(url, { scroll: false })
  }

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <nav className="hidden md:flex w-52 flex-shrink-0 bg-white border-r border-gray-200 flex-col">
        <div className="px-4 py-5 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Dealstash</p>
          <p className="text-sm font-semibold text-gray-800 truncate">Acme Capital</p>
        </div>

        <div className="flex-1 px-3 py-4 space-y-0.5">
          {showSearch ? (
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 mb-1">
              <SearchIcon />
              <input
                ref={inputRef}
                value={query}
                onChange={e => handleChange(e.target.value)}
                placeholder="Search deals…"
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none min-w-0"
              />
              <button
                onClick={closeSearch}
                className="text-gray-300 hover:text-gray-500 text-xs leading-none"
                aria-label="Close search"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors mb-1"
            >
              <SearchIcon />
              <span className="flex-1 text-left">Search</span>
              <kbd className="text-xs border border-gray-200 rounded px-1 py-0.5 leading-none">⌘K</kbd>
            </button>
          )}

          <NavLinks
            pathname={pathname}
            onImportDeals={() => setShowImportWizard(true)}
          />
        </div>

        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">demo@acmecapital.com</p>
          <Link href="/signup" className="text-xs text-blue-600 hover:underline mt-1 block">
            Create your account →
          </Link>
        </div>
      </nav>

      {/* ── Mobile top bar ────────────────────────────────────── */}
      <div className="md:hidden fixed top-10 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center gap-3 px-4 h-14">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 rounded-md text-gray-500 hover:bg-gray-100"
          aria-label="Open menu"
        >
          <HamburgerIcon />
        </button>
        <p className="text-sm font-semibold text-gray-800">Acme Capital</p>
      </div>

      {/* ── Mobile slide-out drawer ───────────────────────────── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-64 bg-white flex flex-col shadow-xl">
            <div className="px-4 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Dealstash</p>
                <p className="text-sm font-semibold text-gray-800">Acme Capital</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100"
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 px-3 py-4 space-y-0.5">
              <NavLinks
                pathname={pathname}
                onImportDeals={() => setShowImportWizard(true)}
                onClick={() => setDrawerOpen(false)}
              />
            </div>

            <div className="px-4 py-4 border-t border-gray-100 space-y-3">
              <p className="text-xs text-gray-400">demo@acmecapital.com</p>
              <Link
                href="/signup"
                className="block w-full text-center bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-md hover:bg-gray-800 transition-colors"
              >
                Sign up free →
              </Link>
            </div>
          </div>
        </div>
      )}

      {showImportWizard && (
        <DemoImportWizard onClose={() => setShowImportWizard(false)} />
      )}
    </>
  )
}
