'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SearchModal from '@/components/search/SearchModal'

interface Props {
  firmName: string
  userEmail: string
}

const navLinks = [
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/import/deals', label: 'Import Deals' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/graveyard', label: 'Graveyard' },
  { href: '/settings', label: 'Settings' },
]

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname()
  return (
    <>
      {navLinks.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          onClick={onClick}
          className={`block px-3 py-2 rounded-md text-sm transition-colors
            ${pathname.startsWith(href)
              ? 'bg-gray-100 text-gray-900 font-medium'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
        >
          {label}
        </Link>
      ))}
    </>
  )
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
    </svg>
  )
}

export default function MobileSidebar({ firmName, userEmail }: Props) {
  const [open, setOpen] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex w-52 flex-shrink-0 bg-white border-r border-gray-200 flex-col">
        <div className="px-4 py-5 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
            Dealstash
          </p>
          <p className="text-sm font-semibold text-gray-800 truncate">{firmName}</p>
        </div>

        <div className="flex-1 px-3 py-4 space-y-0.5">
          <button
            onClick={() => setShowSearch(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors mb-1"
          >
            <SearchIcon />
            <span className="flex-1 text-left">Search</span>
            <kbd className="text-xs border border-gray-200 rounded px-1 py-0.5 leading-none">⌘K</kbd>
          </button>
          <NavLinks />
        </div>

        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-xs text-gray-400 hover:text-gray-600 mt-1">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14">
        <p className="text-sm font-semibold text-gray-800 truncate">{firmName}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
            aria-label="Search"
          >
            <SearchIcon />
          </button>
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative w-64 bg-white flex flex-col shadow-xl">
            <div className="px-4 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
                  Dealstash
                </p>
                <p className="text-sm font-semibold text-gray-800 truncate">{firmName}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100"
                aria-label="Close menu"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 px-3 py-4 space-y-0.5">
              <NavLinks onClick={() => setOpen(false)} />
            </div>

            <div className="px-4 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              <form action="/auth/signout" method="post">
                <button type="submit" className="text-xs text-gray-400 hover:text-gray-600 mt-1">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </>
  )
}
