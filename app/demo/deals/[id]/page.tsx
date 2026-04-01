import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  getDemoDeal,
  getDemoStage,
  getDemoContact,
  DEMO_DEAL_SNAPSHOTS,
  DEMO_DEAL_NOTES,
  DEMO_DEAL_CONTACTS,
  DEMO_SCORING_CRITERIA,
  DEMO_DEAL_SCORES,
  DEMO_DEAL_OVERALL_SCORES,
  DEMO_DEAL_EVENTS,
} from '@/lib/demo-data'
import DemoDealTabs from '@/components/demo/DemoDealTabs'

interface Props {
  params: Promise<{ id: string }>
}

const TYPE_COLORS: Record<string, string> = {
  broker: 'bg-blue-50 text-blue-700',
  seller: 'bg-green-50 text-green-700',
  lender: 'bg-purple-50 text-purple-700',
}

const EVENT_STYLES: Record<string, { label: string; dot: string }> = {
  deal_created:  { label: 'Deal Created',  dot: 'bg-blue-500'   },
  stage_changed: { label: 'Stage Changed', dot: 'bg-gray-400'   },
  killed:        { label: 'Deal Killed',   dot: 'bg-red-500'    },
  note_added:    { label: 'Note Updated',  dot: 'bg-green-400'  },
  file_added:    { label: 'File Uploaded', dot: 'bg-purple-400' },
}

function fmt(val: number | null, isPercent = false): string {
  if (val === null || val === undefined) return '—'
  if (isPercent) return `${val.toFixed(2)}%`
  return `$${val.toLocaleString()}`
}

function scoreToColor(pct: number) {
  if (pct < 40) return 'text-red-600'
  if (pct < 70) return 'text-amber-500'
  return 'text-green-600'
}

function scoreToBg(pct: number) {
  if (pct < 40) return 'bg-red-50 border-red-200'
  if (pct < 70) return 'bg-amber-50 border-amber-200'
  return 'bg-green-50 border-green-200'
}

function DemoLabel() {
  return (
    <span className="flex items-center gap-1 text-xs text-gray-400 font-normal">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      Demo data
    </span>
  )
}

export default async function DemoDealPage({ params }: Props) {
  const { id } = await params
  const deal = getDemoDeal(id)
  if (!deal) notFound()

  const stage = getDemoStage(deal.stage_id ?? '')
  const snapshot = DEMO_DEAL_SNAPSHOTS[id] ?? null
  const notes = DEMO_DEAL_NOTES[id] ?? null
  const linkedContacts = (DEMO_DEAL_CONTACTS[id] ?? []).map(dc => ({
    ...dc,
    contact: getDemoContact(dc.contact_id),
  }))
  const criteria = DEMO_SCORING_CRITERIA
  const scores = DEMO_DEAL_SCORES[id] ?? {}
  const events = DEMO_DEAL_EVENTS[id] ?? []

  const scoredVals = Object.values(scores)
  const overallScore = scoredVals.length > 0
    ? (DEMO_DEAL_OVERALL_SCORES[id] ?? Math.round(((scoredVals.reduce((a, b) => a + b, 0) / scoredVals.length) - 1) / 4 * 100))
    : null

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
        <Link href="/demo" className="hover:text-gray-700">Pipeline</Link>
        <span>/</span>
        <span className="text-gray-800">{deal.title}</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">{deal.title}</h1>
          <span className="flex-shrink-0 mt-1 text-[10px] bg-blue-50 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5 font-medium whitespace-nowrap">
            Demo
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 flex-wrap">
          {deal.market && (
            <span className="flex items-center gap-1.5">
              {deal.market}
              <a
                href={`https://www.google.com/maps/search/?q=${encodeURIComponent(deal.market)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-blue-500 transition-colors"
                title="View on Google Maps"
              >
                <MapPin size={11} strokeWidth={2} />
                <span>Map</span>
              </a>
            </span>
          )}
          {deal.deal_type && <span className="before:content-['·'] before:mr-3">{deal.deal_type}</span>}
          {deal.source_name && <span className="before:content-['·'] before:mr-3">via {deal.source_name}</span>}
          {stage && (
            <span className="before:content-['·'] before:mr-3 text-gray-700 font-medium">{stage.name}</span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <DemoDealTabs />

      <div className="space-y-8">

        {/* Notes — first */}
        {notes && (
          <section id="section-notes" className="space-y-6">
            {notes.overview && (
              <div data-tour="notes">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-semibold text-gray-900">Overview</h2>
                  <DemoLabel />
                </div>
                <div className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-800 font-mono leading-relaxed whitespace-pre-wrap bg-white min-h-[80px]">
                  {notes.overview}
                </div>
              </div>
            )}
            {notes.risks && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-semibold text-gray-900">Risks</h2>
                  <DemoLabel />
                </div>
                <div className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-800 font-mono leading-relaxed whitespace-pre-wrap bg-white min-h-[80px]">
                  {notes.risks}
                </div>
              </div>
            )}
            {notes.notes && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-semibold text-gray-900">Notes</h2>
                  <DemoLabel />
                </div>
                <div className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-800 font-mono leading-relaxed whitespace-pre-wrap bg-white min-h-[80px]">
                  {notes.notes}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Financial Snapshot */}
        {snapshot && (
          <section id="section-financials">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Financial Snapshot</h2>
              <DemoLabel />
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: 'Purchase Price', value: fmt(snapshot.purchase_price) },
                { label: 'NOI',            value: fmt(snapshot.noi) },
                { label: 'Cap Rate',       value: fmt(snapshot.cap_rate, true) },
                { label: 'Debt Rate',      value: fmt(snapshot.debt_rate, true) },
                { label: 'LTV',            value: fmt(snapshot.ltv, true) },
                { label: 'Projected IRR',  value: fmt(snapshot.projected_irr, true) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-gray-100 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className="text-sm font-semibold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
            {snapshot.notes && (
              <p className="text-xs text-gray-500 italic">{snapshot.notes}</p>
            )}
          </section>
        )}

        {/* Underwriting Score */}
        {scoredVals.length > 0 && overallScore !== null && (
          <section id="section-scoring">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Underwriting Score</h2>
              <div className="flex items-center gap-3">
                <DemoLabel />
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${scoreToBg(overallScore)}`}>
                  <span className={scoreToColor(overallScore)}>{overallScore}/100</span>
                </span>
              </div>
            </div>
            <div className={`rounded-lg border px-4 py-3 mb-4 flex items-center gap-4 ${scoreToBg(overallScore)}`}>
              <div>
                <p className={`text-3xl font-bold ${scoreToColor(overallScore)}`}>{overallScore}</p>
                <p className="text-xs text-gray-500 mt-0.5">out of 100</p>
              </div>
              <div className="flex-1">
                <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-gray-200">
                  <div
                    className={`h-full rounded-full ${overallScore < 40 ? 'bg-red-500' : overallScore < 70 ? 'bg-amber-400' : 'bg-green-500'}`}
                    style={{ width: `${overallScore}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{scoredVals.length} of {criteria.length} criteria scored</p>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {criteria.map(c => {
                const score = scores[c.id]
                return (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(val => (
                        <div
                          key={val}
                          className={`w-8 h-8 rounded text-sm font-medium border flex items-center justify-center ${
                            score === val
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-300 border-gray-200'
                          }`}
                        >
                          {val}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Files */}
        <section id="section-files">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Files</h2>
            <Link href="/signup" className="btn-secondary text-sm">+ Upload File</Link>
          </div>
          <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-400">
              <Link href="/signup" className="text-blue-600 hover:underline">Sign up</Link> to upload OMs, financials, and due diligence docs.
            </p>
          </div>
        </section>

        {/* Contacts */}
        <section id="section-contacts">
          {linkedContacts.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">Contacts</h2>
                <DemoLabel />
              </div>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                {linkedContacts.map(dc => {
                  const c = dc.contact
                  if (!c) return null
                  return (
                    <div key={dc.contact_id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{c.name}</span>
                          {c.contact_type && (
                            <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${TYPE_COLORS[c.contact_type] ?? ''}`}>
                              {c.contact_type}
                            </span>
                          )}
                          {dc.is_source && (
                            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">Source</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{c.company}</p>
                      </div>
                      <span className="text-xs text-gray-400">{c.email}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          {linkedContacts.length === 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Contacts</h2>
              <p className="text-sm text-gray-400">No contacts linked to this deal.</p>
            </div>
          )}
        </section>

        {/* Decision Log / Activity */}
        <section id="section-activity">
          {events.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Decision Log</h2>
                <DemoLabel />
              </div>
              <div className="relative border-l-2 border-gray-100 pl-5 space-y-5">
                {events.map(event => {
                  const style = EVENT_STYLES[event.event_type] ?? { label: event.event_type, dot: 'bg-gray-300' }
                  return (
                    <div key={event.id} className="relative">
                      <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-white ${style.dot}`} />
                      <div className="bg-white border border-gray-100 rounded-lg px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800">{style.label}</span>
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {event.event_type === 'stage_changed' && event.from_stage && event.to_stage && (
                          <p className="text-xs text-gray-500 mb-1">
                            {event.from_stage} → {event.to_stage}
                          </p>
                        )}
                        {event.event_type === 'file_added' && event.notes && (
                          <p className="text-xs text-gray-500">{event.notes}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">by {event.actor}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>

        {/* Sign-up CTA */}
        <div className="bg-gray-900 rounded-xl p-6 text-center">
          <p className="text-white font-semibold mb-1">Ready to track your real deals?</p>
          <p className="text-gray-400 text-sm mb-4">Set up your pipeline in minutes. 30-day free trial, no credit card required.</p>
          <Link href="/signup" className="inline-block bg-white text-gray-900 text-sm font-semibold px-6 py-2.5 rounded-md hover:bg-gray-100 transition-colors">
            Get started free →
          </Link>
        </div>
      </div>
    </div>
  )
}
