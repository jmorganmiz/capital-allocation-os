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
  { href: '/sourcing', label: 'Source' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/graveyard', label: 'Graveyard' },
  { href: '/settings', label: 'Settings' },
]

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname()
  return (
    <>
      {navLinks.map(({ href, label }) => {
        const isActive = pathname.startsWith(href)
        const isSettings = href === '/settings'
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm transition-colors rounded-md"
            style={isActive ? {
              background: 'rgba(82,102,235,0.1)',
              color: 'var(--starlight)',
              fontWeight: 500,
              borderLeft: '2px solid var(--mercury-blue)',
              paddingLeft: 'calc(0.875rem - 2px)',
              borderRadius: '0 8px 8px 0',
            } : {
              color: 'var(--silver)',
            }}
          >
            <span>{label}</span>
            {isSettings && (
              <span
                aria-label="Workspace setup items live in Settings"
                title="Settings includes workspace setup: buy box, stages, kill reasons, scoring, billing, and team."
                style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fbbf24', flexShrink: 0 }}
              />
            )}
          </Link>
        )
      })}
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

const sidebarStyle = {
  background: 'var(--midnight-slate)',
  borderRight: '1px solid rgba(112,112,125,0.18)',
}

const headerStyle = {
  borderBottom: '1px solid rgba(112,112,125,0.12)',
  padding: '20px 16px 16px',
}

const footerStyle = {
  borderTop: '1px solid rgba(112,112,125,0.12)',
  padding: '16px',
}

const kbdStyle = {
  fontSize: '11px',
  border: '1px solid rgba(112,112,125,0.25)',
  borderRadius: '4px',
  padding: '1px 5px',
  color: 'var(--lead)',
  background: 'transparent',
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
      <nav style={sidebarStyle} className="hidden md:flex w-60 flex-shrink-0 flex-col">
        <div style={headerStyle}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--lead)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>
            Dealstash
          </p>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--starlight)' }} className="truncate">{firmName}</p>
        </div>

        <div className="flex-1 px-4 py-5 space-y-1">
          <button
            onClick={() => setShowSearch(true)}
            style={{ color: 'var(--lead)', fontSize: '13px' }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-md transition-colors mb-2"
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(39,39,53,0.65)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <SearchIcon />
            <span className="flex-1 text-left">Search</span>
            <kbd style={kbdStyle}>⌘K</kbd>
          </button>
          <NavLinks />
        </div>

        <div style={footerStyle}>
          <p style={{ fontSize: '12px', color: 'var(--lead)' }} className="truncate">{userEmail}</p>
          <form action="/auth/signout" method="post">
            <button type="submit" style={{ fontSize: '12px', color: 'var(--lead)', marginTop: '4px' }}
                    className="transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      {/* Mobile top bar */}
      <div style={{ background: 'var(--midnight-slate)', borderBottom: '1px solid rgba(112,112,125,0.18)' }}
           className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14">
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--starlight)' }} className="truncate">{firmName}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(true)}
            style={{ color: 'var(--lead)' }}
            className="p-2 rounded-md"
            aria-label="Search"
          >
            <SearchIcon />
          </button>
          <button
            onClick={() => setOpen(true)}
            style={{ color: 'var(--lead)' }}
            className="p-2 rounded-md"
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
          <div style={sidebarStyle} className="relative w-64 flex flex-col">
            <div style={headerStyle} className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--lead)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Dealstash
                </p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--starlight)' }} className="truncate">{firmName}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ color: 'var(--lead)' }}
                className="p-1.5 rounded-md"
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

            <div style={footerStyle}>
              <p style={{ fontSize: '12px', color: 'var(--lead)' }} className="truncate">{userEmail}</p>
              <form action="/auth/signout" method="post">
                <button type="submit" style={{ fontSize: '12px', color: 'var(--lead)', marginTop: '4px' }}
                        className="transition-colors">
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
