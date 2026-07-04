'use client'

import { useState, useTransition } from 'react'
import { requestUnderwritingAccess } from '@/lib/actions/underwriting-access'
import type { UnderwritingAccessRequest } from '@/lib/types/database'

export default function UnderwritingAccessCard({ enabled, initialRequest }: { enabled: boolean; initialRequest: UnderwritingAccessRequest | null }) {
  const [request, setRequest] = useState(initialRequest)
  const [teamSize, setTeamSize] = useState('5')
  const [volume, setVolume] = useState('25')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function submit() {
    setError('')
    startTransition(async () => {
      const result = await requestUnderwritingAccess({ teamSize: Number(teamSize), monthlyDealVolume: Number(volume), workflowNotes: notes })
      if (result.error) setError(result.error)
      else if (result.request) setRequest(result.request as UnderwritingAccessRequest)
    })
  }

  return (
    <section>
      <div className="app-settings-section-header">
        <div><p>Underwriting Pro</p><h2>Beta access</h2></div>
        <span>{enabled ? 'Enabled' : request?.status === 'pending' ? 'Pending review' : 'Private beta'}</span>
      </div>
      <p className="app-settings-section-copy">Unlimited Quick Pencils, cited Full Underwrites, approval gates, sensitivities, and IC memo exports.</p>

      {enabled ? (
        <div className="app-beta-status" data-tone="green"><strong>Your firm has Underwriting Pro.</strong><span>Open any deal and select the Underwriting tab to begin.</span></div>
      ) : request?.status === 'pending' ? (
        <div className="app-beta-status" data-tone="amber"><strong>Request received.</strong><span>We’ll review your workflow and contact your team before enabling the beta.</span></div>
      ) : (
        <div className="app-beta-request-grid">
          <label><span>Acquisitions team size</span><input inputMode="numeric" value={teamSize} onChange={(event) => setTeamSize(event.target.value)} /></label>
          <label><span>Deals reviewed per month</span><input inputMode="numeric" value={volume} onChange={(event) => setVolume(event.target.value)} /></label>
          <label className="wide"><span>Current underwriting workflow</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Where OMs, models, approvals, and IC memos live today..." /></label>
          <div className="wide app-settings-form-actions"><button type="button" onClick={submit} disabled={pending}>{pending ? 'Sending…' : 'Request beta access'}</button></div>
        </div>
      )}
      {error && <p className="app-form-error">{error}</p>}
    </section>
  )
}
