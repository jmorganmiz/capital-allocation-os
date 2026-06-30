'use client'

import { useState } from 'react'
import {
  ContactType,
  createContact,
  getContacts,
  linkContactToDeal,
  unlinkContactFromDeal,
  updateDealContactSource,
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

function contactInitials(contact: Contact) {
  return contact.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'C'
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

  const linkedIds = new Set(dealContacts.map((dealContact) => dealContact.contact_id))

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (!q.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    const result = await getContacts()
    if (result.contacts) {
      const lower = q.toLowerCase()
      setSearchResults(
        (result.contacts as Contact[])
          .filter((contact) => !linkedIds.has(contact.id) &&
            (contact.name.toLowerCase().includes(lower) || (contact.company ?? '').toLowerCase().includes(lower)))
          .slice(0, 8),
      )
    }
    setSearching(false)
  }

  async function handleLink(contact: Contact) {
    const result = await linkContactToDeal(contact.id, dealId, false)
    if (result.error) {
      setError(result.error)
      return
    }

    const newDealContact: DealContact = {
      id: crypto.randomUUID(),
      contact_id: contact.id,
      deal_id: dealId,
      is_source: false,
      contacts: contact,
    }
    setDealContacts((prev) => [...prev, newDealContact])
    setShowAddPanel(false)
    setSearchQuery('')
    setSearchResults([])
  }

  async function handleUnlink(dealContact: DealContact) {
    const result = await unlinkContactFromDeal(dealContact.contact_id, dealId)
    if (result.error) {
      setError(result.error)
      return
    }
    setDealContacts((prev) => prev.filter((item) => item.id !== dealContact.id))
  }

  async function handleToggleSource(dealContact: DealContact) {
    const next = !dealContact.is_source
    const result = await updateDealContactSource(dealContact.contact_id, dealId, next)
    if (result.error) {
      setError(result.error)
      return
    }
    setDealContacts((prev) => prev.map((item) => item.id === dealContact.id ? { ...item, is_source: next } : item))
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!newName.trim()) return

    setCreating(true)
    setError(null)
    const result = await createContact({
      name: newName.trim(),
      contact_type: (newType || null) as ContactType | null,
      company: newCompany.trim() || null,
      email: newEmail.trim() || null,
    })

    if (result.error) {
      setError(result.error)
      setCreating(false)
      return
    }

    const contact = (result as any).contact as Contact
    await handleLink(contact)
    setNewName('')
    setNewType('')
    setNewCompany('')
    setNewEmail('')
    setShowCreateForm(false)
    setCreating(false)
  }

  return (
    <>
      <div className="app-deal-section-header">
        <div>
          <p>Relationship map</p>
          <h2>Contacts</h2>
        </div>
        <button onClick={() => setShowAddPanel((value) => !value)} className="app-deal-pill-button">
          + Add Contact
        </button>
      </div>

      {error && <p className="app-deal-error">{error}</p>}

      {showAddPanel && (
        <div className="app-deal-contact-panel">
          {!showCreateForm ? (
            <>
              <input
                value={searchQuery}
                onChange={(event) => handleSearch(event.target.value)}
                placeholder="Search existing contacts..."
                autoFocus
              />

              {searching && <p className="app-deal-muted">Searching...</p>}

              {searchResults.length > 0 && (
                <div className="app-deal-contact-results">
                  {searchResults.map((contact) => (
                    <button key={contact.id} onClick={() => handleLink(contact)}>
                      <span>
                        <strong>{contact.name}</strong>
                        {contact.company && <em>{contact.company}</em>}
                      </span>
                      {contact.contact_type && <small>{contact.contact_type}</small>}
                    </button>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !searching && (
                <p className="app-deal-muted">No matches found.</p>
              )}

              <div className="app-deal-form-actions">
                <button onClick={() => setShowCreateForm(true)} data-primary="true">
                  + Create new contact
                </button>
                <button onClick={() => {
                  setShowAddPanel(false)
                  setSearchQuery('')
                  setSearchResults([])
                }}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleCreate} className="app-deal-contact-form">
              <p>New Contact</p>
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                required
                placeholder="Name *"
                autoFocus
              />
              <select
                value={newType}
                onChange={(event) => setNewType(event.target.value as ContactType | '')}
              >
                <option value="">Select type...</option>
                <option value="broker">Broker</option>
                <option value="seller">Seller</option>
                <option value="lender">Lender</option>
              </select>
              <input
                value={newCompany}
                onChange={(event) => setNewCompany(event.target.value)}
                placeholder="Company"
              />
              <input
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                placeholder="Email"
              />
              <div className="app-deal-form-actions">
                <button type="button" onClick={() => setShowCreateForm(false)}>Back</button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  data-primary="true"
                >
                  {creating ? 'Creating...' : 'Create & Link'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {dealContacts.length === 0 ? (
        <div className="app-deal-empty">No contacts linked to this deal yet.</div>
      ) : (
        <div className="app-deal-contact-list">
          {dealContacts.map((dealContact) => {
            const contact = dealContact.contacts
            if (!contact) return null

            return (
              <div key={dealContact.id} className="app-deal-contact-row">
                <div className="app-deal-contact-person">
                  <span>{contactInitials(contact)}</span>
                  <div>
                    <strong>{contact.name}</strong>
                    <em>{contact.company || contact.email || 'No company captured'}</em>
                  </div>
                </div>

                <div className="app-deal-contact-tags">
                  {contact.contact_type && <small>{contact.contact_type}</small>}
                  {dealContact.is_source && <small data-tone="amber">Source</small>}
                </div>

                <div className="app-deal-contact-actions">
                  <button onClick={() => handleToggleSource(dealContact)}>
                    {dealContact.is_source ? 'Remove source' : 'Mark source'}
                  </button>
                  <button onClick={() => handleUnlink(dealContact)} data-danger="true">
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
