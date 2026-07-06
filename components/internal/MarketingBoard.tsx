'use client'

import { useState } from 'react'
import { upsertCampaign, addOutreachContact, updateOutreachStatus } from '@/lib/internal/actions'

type Campaign = {
  id: string
  name: string
  channel: string
  status: string
  start_date: string | null
  end_date: string | null
  attributed_signups: number
}

type Outreach = {
  id: string
  contact_name: string
  company: string | null
  status: string
  last_touch: string | null
  notes: string | null
  campaigns: { name: string } | null
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(112,112,125,0.3)',
  color: '#f4f4f8',
}

const OUTREACH_FLOW: Record<string, string[]> = {
  contacted: ['responded', 'dead'],
  responded: ['converted', 'dead'],
  converted: [],
  dead: [],
}

export default function MarketingBoard({ campaigns, outreach, funnel, canWrite }: {
  campaigns: Campaign[]
  outreach: Outreach[]
  funnel: { signups: number; activated: number; paying: number }
  canWrite: boolean
}) {
  const [addingCampaign, setAddingCampaign] = useState(false)
  const [addingContact, setAddingContact] = useState(false)
  const [error, setError] = useState('')

  async function handleCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const result = await upsertCampaign({
      name: String(form.get('name') ?? ''),
      channel: String(form.get('channel') ?? ''),
      status: String(form.get('status') ?? 'planned'),
      startDate: String(form.get('startDate') ?? '') || null,
      endDate: String(form.get('endDate') ?? '') || null,
    })
    if (result?.error) setError(result.error)
    else setAddingCampaign(false)
  }

  async function handleContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const result = await addOutreachContact({
      contactName: String(form.get('contactName') ?? ''),
      company: String(form.get('company') ?? ''),
      notes: String(form.get('notes') ?? ''),
      campaignId: String(form.get('campaignId') ?? '') || null,
    })
    if (result?.error) setError(result.error)
    else setAddingContact(false)
  }

  async function advanceOutreach(id: string, status: string) {
    setError('')
    const result = await updateOutreachStatus(id, status)
    if (result?.error) setError(result.error)
  }

  const funnelSteps = [
    { label: 'Signups', value: funnel.signups },
    { label: 'Activated (1+ deal)', value: funnel.activated },
    { label: 'Paying', value: funnel.paying },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#f4f4f8' }}>Marketing</h1>
        <p className="mt-1 text-sm" style={{ color: '#8b8b9a' }}>Campaigns, outreach, attribution, and the signup funnel.</p>
      </div>

      {error && <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>}

      <section>
        <h2 className="text-base font-semibold" style={{ color: '#f4f4f8' }}>Funnel</h2>
        <p className="mt-1 text-xs" style={{ color: '#8b8b9a' }}>Visit counts need an analytics integration; stages below are live from the database.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {funnelSteps.map((step, index) => (
            <div key={step.label} className="rounded-lg border p-4" style={{ borderColor: 'rgba(112,112,125,0.25)', background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xl font-bold" style={{ color: '#f4f4f8' }}>{step.value}</p>
              <p className="mt-1 text-xs" style={{ color: '#8b8b9a' }}>{step.label}</p>
              {index > 0 && funnelSteps[index - 1].value > 0 && (
                <p className="mt-1 text-xs" style={{ color: '#c7d2fe' }}>
                  {Math.round((step.value / funnelSteps[index - 1].value) * 100)}% of previous
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: '#f4f4f8' }}>Campaigns</h2>
          {canWrite && !addingCampaign && (
            <button type="button" onClick={() => setAddingCampaign(true)} className="rounded-md px-3 py-1.5 text-xs font-semibold" style={{ background: '#6366f1', color: '#fff' }}>+ Campaign</button>
          )}
        </div>
        {addingCampaign && (
          <form onSubmit={handleCampaign} className="mt-3 grid gap-3 rounded-lg border p-4 sm:grid-cols-5" style={{ borderColor: 'rgba(112,112,125,0.25)' }}>
            <input name="name" required placeholder="Campaign name" maxLength={160} className="rounded-md px-3 py-2 text-sm sm:col-span-2" style={inputStyle} />
            <input name="channel" required placeholder="Channel (LinkedIn, SEO…)" maxLength={80} className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
            <select name="status" defaultValue="planned" className="rounded-md px-3 py-2 text-sm" style={inputStyle}>
              {['planned', 'active', 'paused', 'completed'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input name="startDate" type="date" className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
            <div className="flex gap-2">
              <button type="submit" className="rounded-md px-3 py-2 text-xs font-semibold" style={{ background: '#6366f1', color: '#fff' }}>Save</button>
              <button type="button" onClick={() => setAddingCampaign(false)} className="rounded-md px-3 py-2 text-xs" style={{ color: '#c3c3d0' }}>Cancel</button>
            </div>
          </form>
        )}
        <div className="mt-3 overflow-x-auto rounded-lg border" style={{ borderColor: 'rgba(112,112,125,0.25)' }}>
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                {['Campaign', 'Channel', 'Status', 'Attributed signups', 'Dates'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: '#8b8b9a', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center" style={{ color: '#8b8b9a' }}>No campaigns yet.</td></tr>}
              {campaigns.map((campaign) => (
                <tr key={campaign.id} style={{ borderTop: '1px solid rgba(112,112,125,0.15)' }}>
                  <td className="px-4 py-3" style={{ color: '#f4f4f8' }}>{campaign.name}</td>
                  <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>{campaign.channel}</td>
                  <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>{campaign.status}</td>
                  <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>{campaign.attributed_signups}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#8b8b9a' }}>{[campaign.start_date, campaign.end_date].filter(Boolean).join(' → ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: '#f4f4f8' }}>Outreach</h2>
          {canWrite && !addingContact && (
            <button type="button" onClick={() => setAddingContact(true)} className="rounded-md px-3 py-1.5 text-xs font-semibold" style={{ background: '#6366f1', color: '#fff' }}>+ Contact</button>
          )}
        </div>
        {addingContact && (
          <form onSubmit={handleContact} className="mt-3 grid gap-3 rounded-lg border p-4 sm:grid-cols-4" style={{ borderColor: 'rgba(112,112,125,0.25)' }}>
            <input name="contactName" required placeholder="Contact name" maxLength={160} className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
            <input name="company" placeholder="Company" maxLength={160} className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
            <select name="campaignId" className="rounded-md px-3 py-2 text-sm" style={inputStyle} defaultValue="">
              <option value="">No campaign</option>
              {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
            </select>
            <input name="notes" placeholder="Notes" maxLength={2000} className="rounded-md px-3 py-2 text-sm" style={inputStyle} />
            <div className="flex gap-2">
              <button type="submit" className="rounded-md px-3 py-2 text-xs font-semibold" style={{ background: '#6366f1', color: '#fff' }}>Save</button>
              <button type="button" onClick={() => setAddingContact(false)} className="rounded-md px-3 py-2 text-xs" style={{ color: '#c3c3d0' }}>Cancel</button>
            </div>
          </form>
        )}
        <div className="mt-3 space-y-2">
          {outreach.length === 0 && <p className="text-sm" style={{ color: '#8b8b9a' }}>No outreach tracked yet.</p>}
          {outreach.map((contact) => (
            <div key={contact.id} className="flex items-center gap-3 rounded-lg border px-4 py-3" style={{ borderColor: 'rgba(112,112,125,0.2)', background: 'rgba(255,255,255,0.02)' }}>
              <span className="rounded-full px-2 py-0.5 text-xs" style={{
                background: contact.status === 'converted' ? 'rgba(74,222,128,0.12)' : contact.status === 'dead' ? 'rgba(248,113,113,0.12)' : 'rgba(99,102,241,0.15)',
                color: contact.status === 'converted' ? '#4ade80' : contact.status === 'dead' ? '#f87171' : '#c7d2fe',
              }}>{contact.status}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm" style={{ color: '#f4f4f8' }}>{contact.contact_name}{contact.company ? ` · ${contact.company}` : ''}</p>
                <p className="text-xs" style={{ color: '#8b8b9a' }}>
                  {contact.campaigns?.name ?? 'No campaign'}{contact.last_touch ? ` · last touch ${contact.last_touch}` : ''}
                </p>
              </div>
              {canWrite && (OUTREACH_FLOW[contact.status] ?? []).map((next) => (
                <button key={next} type="button" onClick={() => advanceOutreach(contact.id, next)} className="rounded-md px-2 py-1 text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: '#c3c3d0' }}>
                  → {next}
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
