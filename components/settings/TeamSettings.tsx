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

  const pendingInvites = invites.filter(i => !i.accepted_at)

  return (
    <section>
      <div className="app-settings-section-header">
        <div>
          <p>Access</p>
          <h2>Team Members</h2>
        </div>
        <span>{members.length} members</span>
      </div>
      <p className="app-settings-section-copy">{firmName}</p>

      <div className="app-settings-rule-list">
        {members.map(member => (
          <div key={member.id} className="app-settings-person-row">
            <div>
              <strong>{member.full_name ?? 'Unknown'}</strong>
              <span>{member.email}</span>
            </div>
            <em>{member.role ?? 'member'}</em>
          </div>
        ))}
      </div>

      <div className="app-settings-invite-box">
        <div>
          <h3>Invite teammate</h3>
          <p>Bring the investment team into the same decision history.</p>
        </div>
        <div className="app-settings-add-row compact">
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="colleague@firm.com"
            className="input-base"
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
            type="email"
          />
          <button onClick={handleInvite} disabled={isPending || !email.trim()} className="btn-primary disabled:opacity-50">
            {isPending ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>

      {error && <p className="app-settings-status error">{error}</p>}
      {success && <p className="app-settings-status success">{success}</p>}

      {pendingInvites.length > 0 && (
        <div className="app-settings-rule-list">
          {pendingInvites.map(invite => (
            <div key={invite.id} className="app-settings-person-row">
              <div>
                <strong>{invite.email}</strong>
                <span>Pending invitation</span>
              </div>
              <em data-tone="amber">Pending</em>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
