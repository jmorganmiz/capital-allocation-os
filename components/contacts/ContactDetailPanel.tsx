'use client'

import { useState } from 'react'
import Link from 'next/link'
import { deleteContact, ContactType } from '@/lib/actions/contacts'
import CreateContactModal from './CreateContactModal'

interface DealLink {
  id: string
  deal_id: string
  is_source: boolean
  deals: {
    id: string
    title: string
    stage_id: string | null
    deal_stages: { name: string } | null
  } | null
}

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
  contact: Contact
  dealContacts: DealLink[]
  onClose: () => void
  onUpdated: (contact: Contact) => void
  onDeleted: (id: string) => void
}

const TYPE_COLORS: Record<string, string> = {
  broker: 'bg-blue-50 text-blue-700',
  seller: 'bg-green-50 text-green-700',
  lender: 'bg-purple-50 text-purple-700',
}

export default function ContactDetailPanel({
  contact: initialContact,
  dealContacts,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const [contact, setContact] = useState(initialContact)
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirm(`Delete ${contact.name}? This cannot be undone.`)) return
    setDeleting(true)
    const result = await deleteContact(contact.id)
    if (result.error) {
      setError(result.error)
      setDeleting(false)
    } else {
      onDeleted(contact.id)
    }
  }

  function handleUpdated(updated: Contact) {
    setContact(updated)
    setShowEdit(false)
    onUpdated(updated)
  }

  const typeColor = contact.contact_type ? TYPE_COLORS[contact.contact_type] : ''

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
        <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-lg shadow-xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-gray-900">{contact.name}</h2>
                {contact.contact_type && (
                  <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${typeColor}`}>
                    {contact.contact_type}
                  </span>
                )}
              </div>
              {contact.company && (
                <p className="text-sm text-gray-500">{contact.company}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 mt-0.5"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Contact info */}
            <div className="space-y-2">
              {contact.email && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 w-4">✉</span>
                  <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 w-4">☎</span>
                  <a href={`tel:${contact.phone}`} className="text-gray-700 hover:text-gray-900">
                    {contact.phone}
                  </a>
                </div>
              )}
              {!contact.email && !contact.phone && (
                <p className="text-sm text-gray-400">No contact info</p>
              )}
            </div>

            {contact.notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}

            {/* Linked deals */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Deals ({dealContacts.length})
              </p>
              {dealContacts.length === 0 ? (
                <p className="text-sm text-gray-400">Not linked to any deals</p>
              ) : (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {dealContacts.map(dc => (
                    <div key={dc.id} className="flex items-center justify-between px-3 py-2.5">
                      <div>
                        <Link
                          href={`/deals/${dc.deals?.id}`}
                          className="text-sm font-medium text-blue-700 hover:underline"
                        >
                          {dc.deals?.title ?? 'Unknown deal'}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {dc.deals?.deal_stages?.name ?? 'No stage'}
                        </p>
                      </div>
                      {dc.is_source && (
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">
                          Source
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <button
              onClick={() => setShowEdit(true)}
              className="btn-secondary text-sm"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {showEdit && (
        <CreateContactModal
          contact={contact}
          onClose={() => setShowEdit(false)}
          onSaved={handleUpdated}
        />
      )}
    </>
  )
}
