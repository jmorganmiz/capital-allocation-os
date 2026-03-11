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

const TYPE_COLORS: Record<string, string> = {
  broker: 'bg-blue-50 text-blue-700',
  seller: 'bg-green-50 text-green-700',
  lender: 'bg-purple-50 text-purple-700',
}

const TYPES: { value: ContactType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'broker', label: 'Broker' },
  { value: 'seller', label: 'Seller' },
  { value: 'lender', label: 'Lender' },
]

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
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{contacts.length} contacts</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Add Contact
        </button>
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
          <button
            onClick={() => { setSearch(''); setTypeFilter('') }}
            className="btn-ghost"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16 text-sm">
          {contacts.length === 0 ? 'No contacts yet. Add your first contact.' : 'No contacts match your filters.'}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Deals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(contact => (
                <tr
                  key={contact.id}
                  onClick={() => handleRowClick(contact)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{contact.name}</td>
                  <td className="px-4 py-3">
                    {contact.contact_type ? (
                      <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${TYPE_COLORS[contact.contact_type] ?? ''}`}>
                        {contact.contact_type}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{contact.company ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        onClick={e => e.stopPropagation()}
                        className="text-blue-600 hover:underline"
                      >
                        {contact.email}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{contact.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{contact.deal_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateContactModal
          onClose={() => setShowCreate(false)}
          onSaved={handleCreated}
        />
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
