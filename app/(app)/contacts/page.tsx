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

function initials(name: string) {
  return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()
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

  const brokerCount = contacts.filter(contact => contact.contact_type === 'broker').length
  const linkedCount = contacts.filter(contact => contact.deal_count > 0).length
  const topContact = contacts.reduce<Contact | null>((top, contact) => {
    if (!top || contact.deal_count > top.deal_count) return contact
    return top
  }, null)
  const duplicateCount = useMemo(() => {
    const seen = new Map<string, number>()
    contacts.forEach(contact => {
      const key = `${contact.name.trim().toLowerCase()}|${(contact.company ?? '').trim().toLowerCase()}`
      seen.set(key, (seen.get(key) ?? 0) + 1)
    })
    return [...seen.values()].filter(count => count > 1).reduce((sum, count) => sum + count - 1, 0)
  }, [contacts])

  return (
    <div className="app-page app-contacts-page">
      <div className="app-page-header flex items-start justify-between gap-4">
        <div>
          <p className="app-eyebrow">Network</p>
          <h1 className="app-title">Contacts</h1>
          <p className="app-subtitle">{contacts.length} contacts tied to brokers, sellers, lenders, and deals.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ Add Contact</button>
      </div>

      <div className="app-contacts-kpis">
        <div className="app-contacts-kpi">
          <p>{contacts.length}</p>
          <span>Total contacts</span>
        </div>
        <div className="app-contacts-kpi">
          <p>{brokerCount}</p>
          <span>Brokers</span>
        </div>
        <div className="app-contacts-kpi">
          <p>{topContact?.deal_count ?? 0}</p>
          <span>{topContact?.name ?? 'Most active contact'}</span>
        </div>
        <div className="app-contacts-kpi" data-alert={duplicateCount > 0 ? 'true' : 'false'}>
          <p>{duplicateCount || linkedCount}</p>
          <span>{duplicateCount > 0 ? 'Potential duplicates' : 'Linked to deals'}</span>
        </div>
      </div>

      <section className="app-contacts-panel">
        <div className="app-contacts-panel-header">
          <div>
            <p className="app-dashboard-kicker">Network archive</p>
            <h2>Broker and relationship memory</h2>
          </div>
          <span>{filtered.length} shown</span>
        </div>

        <div className="app-contacts-toolbar">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or company..."
            className="input-base"
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as ContactType | '')}
            className="input-base"
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
          <div className="app-dashboard-empty">
            <p>Loading contacts...</p>
            <span>Building your relationship memory.</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="app-dashboard-empty">
            <p>{contacts.length === 0 ? 'No contacts yet.' : 'No contacts match your filters.'}</p>
            <span>{contacts.length === 0 ? 'Add your first broker, seller, or lender to start building network memory.' : 'Try clearing the current search or type filter.'}</span>
          </div>
        ) : (
          <div className="app-contacts-table">
            <div className="app-contacts-row app-contacts-head">
              <span>Name</span>
              <span>Type</span>
              <span>Company</span>
              <span>Email</span>
              <span>Phone</span>
              <span>Deals</span>
            </div>
            {filtered.map(contact => {
              const ts = contact.contact_type ? TYPE_STYLE[contact.contact_type] : null
              return (
                <button
                  key={contact.id}
                  onClick={() => handleRowClick(contact)}
                  className="app-contacts-row"
                  type="button"
                >
                  <div className="app-contacts-name-cell">
                    <span>{initials(contact.name)}</span>
                    <div>
                      <strong>{contact.name}</strong>
                      <em>{contact.company ?? 'No company captured'}</em>
                    </div>
                  </div>
                  <div>
                    {ts ? (
                      <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', background: ts.bg, border: ts.border, color: ts.color, borderRadius: '999px', padding: '3px 8px', textTransform: 'capitalize' }}>
                        {contact.contact_type}
                      </span>
                    ) : <span className="app-contacts-muted">—</span>}
                  </div>
                  <span>{contact.company ?? '—'}</span>
                  <span>
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()}>{contact.email}</a>
                    ) : '—'}
                  </span>
                  <span>{contact.phone ?? '—'}</span>
                  <strong className="app-contacts-deal-count">{contact.deal_count}</strong>
                </button>
              )
            })}
          </div>
        )}
      </section>

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
