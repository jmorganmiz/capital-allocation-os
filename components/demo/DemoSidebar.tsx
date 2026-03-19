'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const navLinks = [
  { href: '/demo',            label: 'Pipeline' },
  { href: '/demo/dashboard',  label: 'Dashboard' },
  { href: '/demo/graveyard',  label: 'Graveyard' },
  { href: '/signup',          label: 'Contacts ↗' },
  { href: '/signup',          label: 'Settings ↗' },
]

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
    </svg>
  )
}

export default function DemoSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
      if (e.key === 'Escape') {
        closeSearch()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (showSearch) inputRef.current?.focus()
  }, [showSearch])

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
    <nav className="hidden md:flex w-52 flex-shrink-0 bg-white border-r border-gray-200 flex-col">
      <div className="px-4 py-5 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Dealstash</p>
        <p className="text-sm font-semibold text-gray-800 truncate">Acme Capital</p>
      </div>

      <div className="flex-1 px-3 py-4 space-y-0.5">
        {/* Search bar — matches real sidebar exactly */}
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

        {navLinks.map(({ href, label }) => (
          <Link
            key={label}
            href={href}
            className={`block px-3 py-2 rounded-md text-sm transition-colors
              ${pathname === href || (href === '/demo' && pathname === '/demo')
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">demo@acmecapital.com</p>
        <Link href="/signup" className="text-xs text-blue-600 hover:underline mt-1 block">
          Create your account →
        </Link>
      </div>
    </nav>
  )
}
