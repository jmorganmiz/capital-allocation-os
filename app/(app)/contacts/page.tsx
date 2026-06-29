'use client'

import { useState, useEffect, useMemo } from 'react'
import { getContacts, getContactWithDeals, ContactType } from '@/lib/actions/contacts'
import CreateContactModal from '@/components/contacts/CreateContactModal'
import ContactDetailPanel from '@/components/contacts/ContactDetailPanel'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  contact_type: ContactType | null
  notes: string | null
  deal_count: number
}

const TYPE_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  broker: { bg: 'rgba(82,102,235,0.1)', border: '1px solid rgba(82,102,235,0.22)', color: 'var(--ghost-blue)' },
  seller: { bg: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' },
  lender: { bg: 'rgba(147,51,234,0.08)', border: '1px solid rgba(147,51,234,0.2)', color: '#c084fc' },
}

const TYPES: { value: ContactType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'broker', label: 'Broker' },
  { value: 'seller', label: 'Seller' },
  { value: 'lender', label: 'Lender' },
]

const th = {
  fontSize: '11px' as const,
  fontWeight: 600,
  color: 'var(--lead)',
  letterSpacing: '0.07em',
  textTransform: 'uppercase' as const,
  padding: '10px 20px',
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [selectedDealContacts, setSelectedDealContacts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ContactType | ''>('')

  useEffect(() => {
    getContacts().then(result => {
      if (result.contacts) setContacts(result.contacts as Contact[])
      setLoading(false)
    })
  }, [])

  async function handleRowClick(contact: Contact) {
    const result = await getContactWithDeals(contact.id)
    setSelectedDealContacts(result.dealContacts ?? [])
    setSelectedContact(contact)
  }

  function handleCreated(contact: any) {
    setContacts(prev => [...prev, { ...contact, deal_count: 0 }].sort((a, b) => a.name.localeCompare(b.name)))
    setShowCreate(false)
  }

  function handleUpdated(updated: any) {
    setContacts(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
    setSelectedContact(updated)
  }

  function handleDeleted(id: string) {
    setContacts(prev => prev.filter(c => c.id !== id))
    setSelectedContact(null)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return contacts.filter(c => {
      if (typeFilter && c.contact_type !== typeFilter) return false
      if (q && !c.name.toLowerCase().includes(q) && !(c.company ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [contacts, search, typeFilter])

  return (
    <div className="mx-auto max-w-[1200px] px-12 py-10">
      <div className="mb-7 flex items-start justify-between">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#ededf3', marginBottom: '4px' }}>Contacts</h1>
          <p style={{ fontSize: '14px', color: '#70707d' }}>{contacts.length} contacts</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ Add Contact</button>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or company…"
          className="input-base w-56"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as ContactType | '')}
          className="input-base w-36"
        >
          {TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {(search || typeFilter) && (
          <button onClick={() => { setSearch(''); setTypeFilter('') }} className="btn-ghost">Clear</button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ fontSize: '13px', color: 'var(--lead)' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg py-16 text-center" style={{ border: '1px dashed rgba(112,112,125,0.25)' }}>
          <p style={{ fontSize: '13px', color: 'var(--lead)' }}>
            {contacts.length === 0 ? 'No contacts yet. Add your first contact.' : 'No contacts match your filters.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(112,112,125,0.2)', boxShadow: 'var(--card-shadow)' }}>
          <table className="w-full min-w-[760px] text-sm">
            <thead style={{ background: 'var(--graphite)', borderBottom: '1px solid rgba(112,112,125,0.15)' }}>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>Name</th>
                <th style={{ ...th, textAlign: 'left' }}>Type</th>
                <th style={{ ...th, textAlign: 'left' }}>Company</th>
                <th style={{ ...th, textAlign: 'left' }}>Email</th>
                <th style={{ ...th, textAlign: 'left' }}>Phone</th>
                <th style={{ ...th, textAlign: 'left' }}>Deals</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact, i) => {
                const ts = contact.contact_type ? TYPE_STYLE[contact.contact_type] : null
                return (
                  <tr
                    key={contact.id}
                    onClick={() => handleRowClick(contact)}
                    className="cursor-pointer transition-colors"
                    style={{ borderTop: i > 0 ? '1px solid rgba(112,112,125,0.1)' : 'none', background: 'var(--midnight-slate)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--graphite)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--midnight-slate)')}
                  >
                    <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 500, color: 'var(--starlight)' }}>{contact.name}</td>
                    <td style={{ padding: '14px 20px' }}>
                      {ts ? (
                        <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', background: ts.bg, border: ts.border, color: ts.color, borderRadius: '999px', padding: '3px 8px', textTransform: 'capitalize' }}>
                          {contact.contact_type}
                        </span>
                      ) : <span style={{ color: 'var(--lead)', fontSize: '13px' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--silver)' }}>{contact.company ?? '—'}</td>
                    <td style={{ padding: '14px 20px', fontSize: '13px' }}>
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--mercury-blue)' }}>{contact.email}</a>
                      ) : <span style={{ color: 'var(--lead)' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--silver)' }}>{contact.phone ?? '—'}</td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--lead)' }}>{contact.deal_count}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateContactModal onClose={() => setShowCreate(false)} onSaved={handleCreated} />
      )}
      {selectedContact && (
        <ContactDetailPanel
          contact={selectedContact}
          dealContacts={selectedDealContacts}
          onClose={() => setSelectedContact(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
