'use client'

import { useState, useTransition } from 'react'
import { inviteTeamMember } from '@/lib/actions/settings'

interface Member {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  created_at: string
}

interface Invite {
  id: string
  email: string
  created_at: string
  accepted_at: string | null
}

interface Props {
  members: Member[]
  invites: Invite[]
  firmName: string
}

export default function TeamSettings({ members, invites: initialInvites, firmName }: Props) {
  const [invites, setInvites] = useState<Invite[]>(initialInvites)
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function handleInvite() {
    if (!email.trim()) return
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await inviteTeamMember(email.trim())
      if (result.error) {
        setError(result.error)
      } else if (result.invite) {
        setInvites(prev => [result.invite as Invite, ...prev])
        setSuccess(`Invite sent to ${email}`)
        setEmail('')
      }
    })
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 mb-1">Team Members</h2>
      <p className="text-sm text-gray-500 mb-4">{firmName}</p>

      {/* Current members */}
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 mb-6">
        {members.map(member => (
          <div key={member.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">{member.full_name ?? 'Unknown'}</p>
              <p className="text-xs text-gray-400">{member.email}</p>
            </div>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
              {member.role ?? 'member'}
            </span>
          </div>
        ))}
      </div>

      {/* Invite form */}
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Invite Teammate</h3>
      <div className="flex gap-2 mb-4">
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="colleague@firm.com"
          className="input-base flex-1"
          onKeyDown={e => e.key === 'Enter' && handleInvite()}
          type="email"
        />
        <button
          onClick={handleInvite}
          disabled={isPending || !email.trim()}
          className="btn-primary disabled:opacity-50"
        >
          {isPending ? 'Sending…' : 'Send Invite'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {success && <p className="text-sm text-green-600 mb-3">{success}</p>}

      {/* Pending invites */}
      {invites.filter(i => !i.accepted_at).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Pending Invites</h3>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
            {invites.filter(i => !i.accepted_at).map(invite => (
              <div key={invite.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-gray-600">{invite.email}</p>
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
