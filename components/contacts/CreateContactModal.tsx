'use client'

import { useState } from 'react'
import { createContact, updateContact, ContactData, ContactType } from '@/lib/actions/contacts'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  contact_type: ContactType | null
  notes: string | null
}

interface Props {
  contact?: Contact
  onClose: () => void
  onSaved: (contact: any) => void
}

const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: 'broker', label: 'Broker' },
  { value: 'seller', label: 'Seller' },
  { value: 'lender', label: 'Lender' },
]

export default function CreateContactModal({ contact, onClose, onSaved }: Props) {
  const [name, setName] = useState(contact?.name ?? '')
  const [contactType, setContactType] = useState<ContactType | ''>(contact?.contact_type ?? '')
  const [company, setCompany] = useState(contact?.company ?? '')
  const [email, setEmail] = useState(contact?.email ?? '')
  const [phone, setPhone] = useState(contact?.phone ?? '')
  const [notes, setNotes] = useState(contact?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setError(null)

    const data: ContactData = {
      name: name.trim(),
      email:        email.trim() || null,
      phone:        phone.trim() || null,
      company:      company.trim() || null,
      contact_type: (contactType || null) as ContactType | null,
      notes:        notes.trim() || null,
    }

    const result = contact
      ? await updateContact(contact.id, data)
      : await createContact(data)

    if (result.error) {
      setError(result.error)
    } else {
      onSaved(contact ? { ...contact, ...data } : (result as any).contact)
    }

    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">
          {contact ? 'Edit Contact' : 'Add Contact'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="input-base"
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={contactType}
              onChange={e => setContactType(e.target.value as ContactType | '')}
              className="input-base"
            >
              <option value="">Select type…</option>
              {CONTACT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="input-base"
              placeholder="Company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-base"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="input-base"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="input-base resize-none"
              placeholder="Any additional notes…"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : contact ? 'Save Changes' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
