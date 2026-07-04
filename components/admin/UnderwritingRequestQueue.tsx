'use client'

import { useState, useTransition } from 'react'
import { approveUnderwritingRequest, declineUnderwritingRequest } from '@/lib/actions/platform-admin'

type Request = {
  id: string; status: string; team_size: number; monthly_deal_volume: number
  workflow_notes: string | null; created_at: string
  firms: { name: string } | null
  profiles: { full_name: string | null; email: string | null } | null
}

export default function UnderwritingRequestQueue({ initialRequests }: { initialRequests: Request[] }) {
  const [requests, setRequests] = useState(initialRequests)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function decide(id: string, decision: 'approved' | 'declined') {
    setError('')
    startTransition(async () => {
      const result = decision === 'approved' ? await approveUnderwritingRequest(id) : await declineUnderwritingRequest(id)
      if (result.error) return setError(result.error)
      setRequests((current) => current.map((item) => item.id === id ? { ...item, status: decision } : item))
    })
  }

  return <div className="app-admin-queue">
    {error && <p className="app-form-error">{error}</p>}
    {requests.length === 0 && <div className="app-sourcing-empty"><strong>No beta requests.</strong><span>New firm requests will appear here.</span></div>}
    {requests.map((request) => <article key={request.id} data-status={request.status}>
      <div><small>{request.firms?.name ?? 'Unknown firm'}</small><h2>{request.profiles?.full_name ?? request.profiles?.email ?? 'Unknown requester'}</h2><p>{request.workflow_notes ?? 'No workflow notes provided.'}</p></div>
      <dl><div><dt>Team</dt><dd>{request.team_size}</dd></div><div><dt>Monthly deals</dt><dd>{request.monthly_deal_volume}</dd></div><div><dt>Requested</dt><dd>{new Date(request.created_at).toLocaleDateString()}</dd></div></dl>
      <div className="app-sourcing-actions"><span>{request.status}</span>{request.status === 'pending' && <><button type="button" onClick={() => decide(request.id, 'approved')} disabled={pending}>Approve 25</button><button type="button" className="muted" onClick={() => decide(request.id, 'declined')} disabled={pending}>Decline</button></>}</div>
    </article>)}
  </div>
}
