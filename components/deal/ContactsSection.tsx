'use client'

import { useState } from 'react'
import {
  linkContactToDeal,
  unlinkContactFromDeal,
  updateDealContactSource,
  createContact,
  getContacts,
  ContactType,
} from '@/lib/actions/contacts'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  contact_type: ContactType | null
}

interface DealContact {
  id: string
  contact_id: string
  deal_id: string
  is_source: boolean
  contacts: Contact | null
}

interface Props {
  dealId: string
  initialDealContacts: DealContact[]
}

const TYPE_COLORS: Record<string, string> = {
  broker: 'bg-blue-50 text-blue-700',
  seller: 'bg-green-50 text-green-700',
  lender: 'bg-purple-50 text-purple-700',
}

export default function ContactsSection({ dealId, initialDealContacts }: Props) {
  const [dealContacts, setDealContacts] = useState<DealContact[]>(initialDealContacts)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Contact[]>([])
  const [searching, setSearching] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<ContactType | ''>('')
  const [newCompany, setNewCompany] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const linkedIds = new Set(dealContacts.map(dc => dc.contact_id))

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    const result = await getContacts()
    if (result.contacts) {
      const lower = q.toLowerCase()
      setSearchResults(
        (result.contacts as Contact[]).filter(
          c => !linkedIds.has(c.id) &&
            (c.name.toLowerCase().includes(lower) || (c.company ?? '').toLowerCase().includes(lower))
        ).slice(0, 8)
      )
    }
    setSearching(false)
  }

  async function handleLink(contact: Contact) {
    const result = await linkContactToDeal(contact.id, dealId, false)
    if (result.error) { setError(result.error); return }
    const newDc: DealContact = {
      id: crypto.randomUUID(),
      contact_id: contact.id,
      deal_id: dealId,
      is_source: false,
      contacts: contact,
    }
    setDealContacts(prev => [...prev, newDc])
    setShowAddPanel(false)
    setSearchQuery('')
    setSearchResults([])
  }

  async function handleUnlink(dc: DealContact) {
    const result = await unlinkContactFromDeal(dc.contact_id, dealId)
    if (result.error) { setError(result.error); return }
    setDealContacts(prev => prev.filter(d => d.id !== dc.id))
  }

  async function handleToggleSource(dc: DealContact) {
    const next = !dc.is_source
    const result = await updateDealContactSource(dc.contact_id, dealId, next)
    if (result.error) { setError(result.error); return }
    setDealContacts(prev => prev.map(d => d.id === dc.id ? { ...d, is_source: next } : d))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    const result = await createContact({
      name:         newName.trim(),
      contact_type: (newType || null) as ContactType | null,
      company:      newCompany.trim() || null,
      email:        newEmail.trim() || null,
    })
    if (result.error) {
      setError(result.error)
      setCreating(false)
      return
    }
    const contact = (result as any).contact as Contact
    await handleLink(contact)
    setNewName(''); setNewType(''); setNewCompany(''); setNewEmail('')
    setShowCreateForm(false)
    setCreating(false)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Contacts</h2>
        <button
          onClick={() => setShowAddPanel(v => !v)}
          className="btn-secondary text-sm"
        >
          + Add Contact
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {/* Add panel */}
      {showAddPanel && (
        <div className="mb-4 border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
          {!showCreateForm ? (
            <>
              <input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search existing contacts…"
                className="input-base"
                autoFocus
              />
              {searching && <p className="text-sm text-gray-400">Searching…</p>}
              {searchResults.length > 0 && (
                <div className="border border-gray-200 rounded-lg bg-white divide-y divide-gray-100">
                  {searchResults.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleLink(c)}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-800">{c.name}</span>
                        {c.company && <span className="text-xs text-gray-400 ml-2">{c.company}</span>}
                      </div>
                      {c.contact_type && (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${TYPE_COLORS[c.contact_type] ?? ''}`}>
                          {c.contact_type}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {searchQuery && searchResults.length === 0 && !searching && (
                <p className="text-sm text-gray-400">No matches found.</p>
              )}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  + Create new contact
                </button>
                <button onClick={() => { setShowAddPanel(false); setSearchQuery(''); setSearchResults([]) }} className="btn-ghost text-sm">
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleCreate} className="space-y-3">
              <p className="text-sm font-medium text-gray-700">New Contact</p>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
                placeholder="Name *"
                className="input-base"
                autoFocus
              />
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as ContactType | '')}
                className="input-base"
              >
                <option value="">Select type…</option>
                <option value="broker">Broker</option>
                <option value="seller">Seller</option>
                <option value="lender">Lender</option>
              </select>
              <input
                value={newCompany}
                onChange={e => setNewCompany(e.target.value)}
                placeholder="Company"
                className="input-base"
              />
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="Email"
                className="input-base"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn-ghost text-sm">Back</button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating…' : 'Create & Link'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {dealContacts.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-sm text-gray-400">
          No contacts linked to this deal.
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
          {dealContacts.map(dc => {
            const c = dc.contacts
            if (!c) return null
            return (
              <div key={dc.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{c.name}</span>
                      {c.contact_type && (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${TYPE_COLORS[c.contact_type] ?? ''}`}>
                          {c.contact_type}
                        </span>
                      )}
                      {dc.is_source && (
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">
                          Source
                        </span>
                      )}
                    </div>
                    {c.company && (
                      <p className="text-xs text-gray-400 mt-0.5">{c.company}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleSource(dc)}
                    title={dc.is_source ? 'Remove as source' : 'Mark as source'}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      dc.is_source
                        ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {dc.is_source ? '★ Source' : '☆ Source'}
                  </button>
                  <button
                    onClick={() => handleUnlink(dc)}
                    className="text-xs text-gray-400 hover:text-red-600"
                    title="Remove from deal"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
