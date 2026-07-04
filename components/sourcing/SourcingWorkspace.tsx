'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { captureSourcingOpportunity, dismissSourcingOpportunity, promoteSourcingOpportunity } from '@/lib/actions/sourcing'
import type { SourcingOpportunity } from '@/lib/types/database'

export default function SourcingWorkspace({ initialOpportunities }: { initialOpportunities: SourcingOpportunity[] }) {
  const [opportunities, setOpportunities] = useState(initialOpportunities)
  const [form, setForm] = useState({ sourceUrl: '', propertyName: '', address: '', market: '', assetType: 'Multifamily', askingPrice: '', unitCount: '' })
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))

  function capture() {
    setError('')
    startTransition(async () => {
      const result = await captureSourcingOpportunity(form)
      if (result.error) return setError(result.error)
      if (result.opportunity) setOpportunities((current) => [result.opportunity as SourcingOpportunity, ...current])
      setForm({ sourceUrl: '', propertyName: '', address: '', market: '', assetType: 'Multifamily', askingPrice: '', unitCount: '' })
    })
  }

  function promote(id: string) {
    setError('')
    startTransition(async () => {
      const result = await promoteSourcingOpportunity(id)
      if (result.error) return setError(result.error)
      if (result.dealId) router.push(`/deals/${result.dealId}`)
    })
  }

  function dismiss(id: string) {
    startTransition(async () => {
      const result = await dismissSourcingOpportunity(id)
      if (result.error) return setError(result.error)
      setOpportunities((current) => current.map((item) => item.id === id ? { ...item, status: 'dismissed' } : item))
    })
  }

  return (
    <>
      <section className="app-sourcing-capture app-section">
        <div className="app-settings-section-header"><div><p>Controlled ingestion</p><h2>Add an opportunity</h2></div><Link href="/import/deals">Import CSV →</Link></div>
        <p className="app-settings-section-copy">Paste a permitted listing URL or add a property manually. Dealstash does not scrape restricted listing platforms.</p>
        <div className="app-sourcing-form">
          <label className="wide"><span>Listing URL</span><input value={form.sourceUrl} onChange={(event) => set('sourceUrl', event.target.value)} placeholder="https://listing-provider.com/property/..." /></label>
          <label><span>Property name</span><input value={form.propertyName} onChange={(event) => set('propertyName', event.target.value)} /></label>
          <label><span>Address</span><input value={form.address} onChange={(event) => set('address', event.target.value)} /></label>
          <label><span>Market</span><input value={form.market} onChange={(event) => set('market', event.target.value)} placeholder="Dallas, TX" /></label>
          <label><span>Asset type</span><input value={form.assetType} onChange={(event) => set('assetType', event.target.value)} /></label>
          <label><span>Asking price</span><input inputMode="decimal" value={form.askingPrice} onChange={(event) => set('askingPrice', event.target.value)} placeholder="$4,500,000" /></label>
          <label><span>Units</span><input inputMode="numeric" value={form.unitCount} onChange={(event) => set('unitCount', event.target.value)} /></label>
        </div>
        <div className="app-sourcing-submit"><span>{error}</span><button type="button" className="btn-primary" onClick={capture} disabled={pending}>{pending ? 'Working…' : 'Match to buy box'}</button></div>
      </section>

      <section className="app-section app-sourcing-inbox">
        <div className="app-settings-section-header"><div><p>Opportunity inbox</p><h2>Property Finder</h2></div><span>{opportunities.filter((item) => !['dismissed', 'promoted'].includes(item.status)).length} active</span></div>
        <div className="app-sourcing-list">
          {opportunities.length === 0 && <div className="app-sourcing-empty"><strong>No sourced opportunities yet.</strong><span>Add a permitted listing URL above or import an existing opportunity file.</span></div>}
          {opportunities.map((item) => {
            const reasons = Array.isArray(item.match_reasons) ? item.match_reasons.map(String) : []
            return (
              <article key={item.id} data-status={item.status}>
                <div className="app-sourcing-score"><strong>{item.match_score ?? '—'}</strong><span>match</span></div>
                <div className="app-sourcing-property"><small>{item.asset_type ?? 'Unclassified'} · {item.market ?? 'Market unknown'}</small><h3>{item.property_name}</h3><p>{item.address ?? item.source_url ?? 'No source reference'}</p><div>{reasons.map((reason) => <span key={reason}>{reason}</span>)}</div></div>
                <div className="app-sourcing-basis"><strong>{item.asking_price == null ? '—' : `$${Number(item.asking_price).toLocaleString()}`}</strong><span>{item.unit_count == null ? 'Units unknown' : `${item.unit_count} units`}</span></div>
                <div className="app-sourcing-actions">
                  {item.possible_duplicate_deal_id ? <Link href={`/deals/${item.possible_duplicate_deal_id}`}>Open duplicate</Link> : item.promoted_deal_id ? <Link href={`/deals/${item.promoted_deal_id}`}>Open deal</Link> : item.status !== 'dismissed' ? <button type="button" onClick={() => promote(item.id)} disabled={pending}>Promote</button> : null}
                  {!['dismissed', 'promoted'].includes(item.status) && <button type="button" className="muted" onClick={() => dismiss(item.id)} disabled={pending}>Dismiss</button>}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}
