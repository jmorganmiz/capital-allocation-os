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
  { href: '/intake', label: 'Intake' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/contacts', label: 'Contacts' },
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
          style={pathname.startsWith(href) ? {
            background: 'rgba(82,102,235,0.1)',
            color: '#ededf3',
            fontWeight: 500,
            borderLeft: '2px solid #5266eb',
            paddingLeft: 'calc(0.75rem - 2px)',
            borderRadius: '0 6px 6px 0',
          } : {
            color: '#c3c3cc',
          }}
          className={`block px-3 py-2 rounded-md text-sm transition-colors
            ${pathname.startsWith(href) ? '' : 'hover:bg-gray-100 hover:text-gray-900'}`}
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
      <nav style={{ background: '#1e1e2a', borderRight: '1px solid rgba(112,112,125,0.18)' }}
           className="hidden md:flex w-52 flex-shrink-0 flex-col">
        <div style={{ borderBottom: '1px solid rgba(112,112,125,0.12)', padding: '20px 16px 16px' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: '#70707d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>
            Dealstash
          </p>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#ededf3' }} className="truncate">{firmName}</p>
        </div>

        <div className="flex-1 px-3 py-4 space-y-0.5">
          <button
            onClick={() => setShowSearch(true)}
            style={{ color: '#70707d', fontSize: '13px' }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors mb-1 hover:bg-gray-100"
          >
            <SearchIcon />
            <span className="flex-1 text-left">Search</span>
            <kbd style={{ fontSize: '11px', border: '1px solid rgba(112,112,125,0.25)', borderRadius: '4px', padding: '1px 5px', color: '#70707d', background: 'transparent' }}>⌘K</kbd>
          </button>
          <NavLinks />
        </div>

        <div style={{ borderTop: '1px solid rgba(112,112,125,0.12)', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#70707d' }} className="truncate">{userEmail}</p>
          <form action="/auth/signout" method="post">
            <button type="submit" style={{ fontSize: '12px', color: '#70707d', marginTop: '4px' }}
                    className="hover:text-gray-500 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      {/* Mobile top bar */}
      <div style={{ background: '#1e1e2a', borderBottom: '1px solid rgba(112,112,125,0.18)' }}
           className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14">
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#ededf3' }} className="truncate">{firmName}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(true)}
            style={{ color: '#70707d' }}
            className="p-2 rounded-md hover:bg-gray-100"
            aria-label="Search"
          >
            <SearchIcon />
          </button>
          <button
            onClick={() => setOpen(true)}
            style={{ color: '#70707d' }}
            className="p-2 rounded-md hover:bg-gray-100"
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
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div style={{ background: '#1e1e2a', borderRight: '1px solid rgba(112,112,125,0.18)' }}
               className="relative w-64 flex flex-col">
            <div style={{ borderBottom: '1px solid rgba(112,112,125,0.12)', padding: '20px 16px 16px' }}
                 className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#70707d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Dealstash
                </p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#ededf3' }} className="truncate">{firmName}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ color: '#70707d' }}
                className="p-1.5 rounded-md hover:bg-gray-100"
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

            <div style={{ borderTop: '1px solid rgba(112,112,125,0.12)', padding: '16px' }}>
              <p style={{ fontSize: '12px', color: '#70707d' }} className="truncate">{userEmail}</p>
              <form action="/auth/signout" method="post">
                <button type="submit" style={{ fontSize: '12px', color: '#70707d', marginTop: '4px' }}
                        className="hover:text-gray-500 transition-colors">
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
