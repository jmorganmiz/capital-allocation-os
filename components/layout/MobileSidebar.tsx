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
  { href: '/intake',    label: 'Intake' },
  { href: '/pipeline',  label: 'Pipeline' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/contacts',  label: 'Contacts' },
  { href: '/graveyard', label: 'Graveyard' },
  { href: '/settings',  label: 'Settings' },
]

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname()
  return (
    <nav>
      {navLinks.map(({ href, label }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            style={{
              display: 'block',
              padding: '10px 20px',
              fontSize: '14px',
              color: isActive ? '#ededf3' : '#c3c3cc',
              fontWeight: isActive ? 600 : 400,
              borderLeft: `2px solid ${isActive ? '#5266eb' : 'transparent'}`,
              background: isActive ? 'rgba(82,102,235,0.08)' : 'transparent',
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  const sidebarContent = (isDrawer = false, onClose?: () => void) => (
    <>
      {/* Firm name */}
      <div style={{
        padding: '0 20px 24px',
        borderBottom: '1px solid rgba(112,112,125,0.12)',
        marginBottom: '12px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#ededf3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {firmName}
        </p>
        {isDrawer && (
          <button onClick={onClose} style={{ color: '#70707d', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 }} aria-label="Close menu">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search */}
      <button
        onClick={() => setShowSearch(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          margin: '0 16px 8px',
          padding: '8px 12px',
          background: 'rgba(39,39,53,0.7)',
          border: '1px solid rgba(112,112,125,0.18)',
          borderRadius: '6px',
          color: '#70707d',
          fontSize: '13px',
          cursor: 'pointer',
          width: 'calc(100% - 32px)',
          textAlign: 'left',
          flexShrink: 0,
        }}
      >
        <SearchIcon />
        <span style={{ flex: 1 }}>Search</span>
        <kbd style={{ fontSize: '10px', border: '1px solid rgba(112,112,125,0.25)', borderRadius: '3px', padding: '1px 4px', color: '#70707d', background: 'transparent' }}>⌘K</kbd>
      </button>

      {/* Nav */}
      <NavLinks onClick={onClose} />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div style={{ padding: '16px 20px 24px', borderTop: '1px solid rgba(112,112,125,0.12)', flexShrink: 0 }}>
        <p style={{ fontSize: '12px', color: '#70707d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</p>
        <form action="/auth/signout" method="post" style={{ marginTop: '6px' }}>
          <button type="submit" style={{ fontSize: '12px', color: '#70707d', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Sign out
          </button>
        </form>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex"
        style={{
          width: '220px',
          minWidth: '220px',
          flexShrink: 0,
          background: '#1e1e2a',
          borderRight: '1px solid rgba(112,112,125,0.18)',
          height: '100%',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: '24px',
        }}
      >
        {sidebarContent()}
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
        style={{ background: '#1e1e2a', borderBottom: '1px solid rgba(112,112,125,0.18)' }}
      >
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#ededf3' }}>{firmName}</p>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSearch(true)} style={{ color: '#70707d', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }} aria-label="Search">
            <SearchIcon />
          </button>
          <button onClick={() => setOpen(true)} style={{ color: '#70707d', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }} aria-label="Open menu">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside
            style={{
              width: '260px',
              background: '#1e1e2a',
              borderRight: '1px solid rgba(112,112,125,0.18)',
              display: 'flex',
              flexDirection: 'column',
              paddingTop: '24px',
              position: 'relative',
              height: '100%',
              overflowY: 'auto',
            }}
          >
            {sidebarContent(true, () => setOpen(false))}
          </aside>
        </div>
      )}

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </>
  )
}
