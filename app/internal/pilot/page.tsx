import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getInternalContext, can } from '@/lib/internal/auth'
import { getPilotAnalytics } from '@/lib/pilot-analytics'

function formatNumber(value: number | null, options?: Intl.NumberFormatOptions) {
  if (value === null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', options).format(value)
}

function formatMinutes(value: number | null) {
  if (value === null) return '—'
  if (value < 1) return '<1m'
  return `${formatNumber(value, { maximumFractionDigits: 1 })}m`
}

function pct(value: number | null) {
  if (value === null) return '—'
  return `${formatNumber(value, { maximumFractionDigits: 0 })}%`
}

const cardStyle = {
  borderColor: 'rgba(112,112,125,0.25)',
  background: 'rgba(255,255,255,0.035)',
}

export default async function InternalPilotPage() {
  const context = await getInternalContext()
  if (!context || !can(context, 'ops')) notFound()

  const analytics = await getPilotAnalytics(createAdminClient())

  const headlineCards = [
    { label: 'Pilot firms active', value: analytics.headline.firms },
    { label: `Deals processed (${analytics.windowDays}d)`, value: analytics.headline.dealsProcessed },
    { label: 'Avg email ? parsed', value: formatMinutes(analytics.headline.avgEmailParseMinutes) },
    { label: 'Decision capture', value: pct(analytics.headline.decisionCaptureRate) },
    { label: 'Export-ready records', value: pct(analytics.headline.yardiReadyRate) },
  ]

  const readyDeals = analytics.yardiReadyDeals.filter((deal) => deal.ready).length
  const blockedDeals = analytics.yardiReadyDeals.length - readyDeals

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#5266eb' }}>Pilot analytics</p>
          <h1 className="mt-2 text-2xl font-bold" style={{ color: '#f4f4f8' }}>Proof dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: '#8b8b9a' }}>
            Measures whether Dealstash is becoming the system of record: intake reliability, review consistency,
            decision memory, underwriting usage, and export-ready deal records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="rounded-full border px-3 py-2 text-sm font-semibold" style={{ borderColor: 'rgba(82,102,235,0.5)', color: '#dfe3ff' }} href="/api/internal/pilot/export?mode=summary">Export summary CSV</a>
          <a className="rounded-full px-3 py-2 text-sm font-semibold" style={{ background: '#5266eb', color: '#fff' }} href="/api/internal/pilot/export?mode=yardi">Export-ready CSV</a>
        </div>
      </div>

      <section className="rounded-xl border p-5" style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#8b8b9a' }}>Case-study target</p>
        <p className="mt-3 text-lg leading-7" style={{ color: '#f4f4f8' }}>
          “Across three pilot teams and 150 deals, Dealstash reduced initial screening time by 65%,
          captured structured kill reasons on 92% of rejected deals, and produced Export-ready records for
          85% of advanced opportunities.”
        </p>
        <p className="mt-3 text-xs" style={{ color: '#8b8b9a' }}>
          This page tracks the raw ingredients for that claim. Keep the language out of marketing until the pilot data supports it.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {headlineCards.map((metric) => (
          <div key={metric.label} className="rounded-xl border p-4" style={cardStyle}>
            <p className="text-2xl font-bold" style={{ color: '#f4f4f8' }}>{metric.value}</p>
            <p className="mt-1 text-xs" style={{ color: '#8b8b9a' }}>{metric.label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border p-5" style={cardStyle}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#8b8b9a' }}>Firm scorecard</p>
            <h2 className="mt-1 text-lg font-semibold" style={{ color: '#f4f4f8' }}>Pilot readiness by account</h2>
          </div>
          <p className="text-sm" style={{ color: '#c3c3d0' }}>{analytics.firms.length} firms</p>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border" style={{ borderColor: 'rgba(112,112,125,0.18)' }}>
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.035)' }}>
                {['Firm', 'Deals 30d', 'Users 14d', 'Email fail', 'Parsed speed', 'Scored', 'Decisions', 'Field acceptance', 'Export-ready', 'QP / Full'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#8b8b9a', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analytics.firms.map((firm) => (
                <tr key={firm.firmId} style={{ borderTop: '1px solid rgba(112,112,125,0.15)' }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: '#f4f4f8' }}>{firm.firmName}</td>
                  <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>{firm.dealsProcessed30d}</td>
                  <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>{firm.returningUsers14d}</td>
                  <td className="px-4 py-3" style={{ color: firm.emailFailed30d ? '#f87171' : '#4ade80' }}>{firm.emailFailed30d} / {firm.emailReceived30d}</td>
                  <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>{formatMinutes(firm.avgEmailParseMinutes)}</td>
                  <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>{pct(firm.scoredDealsRate)}</td>
                  <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>{pct(firm.decisionCaptureRate)}</td>
                  <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>{pct(firm.fieldAcceptanceProxy)}</td>
                  <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>{pct(firm.yardiReadyRate)}</td>
                  <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>{firm.quickPencils30d} / {firm.fullUnderwrites30d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border p-5" style={cardStyle}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#8b8b9a' }}>Export-ready definition</p>
          <h2 className="mt-1 text-lg font-semibold" style={{ color: '#f4f4f8' }}>{readyDeals} ready · {blockedDeals} blocked</h2>
          <ul className="mt-4 space-y-2 text-sm" style={{ color: '#c3c3d0' }}>
            {['Property / market', 'Asset type', 'Sponsor or broker', 'Purchase price, NOI, cap rate', 'Stage and buy-box score', 'Decision rationale', 'Supporting docs', 'Source / review history'].map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border p-5" style={cardStyle}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#8b8b9a' }}>Biggest blockers</p>
          <div className="mt-4 space-y-3">
            {analytics.yardiReadyDeals.filter((deal) => !deal.ready).slice(0, 8).map((deal) => (
              <div key={deal.dealId} className="rounded-lg border p-3" style={{ borderColor: 'rgba(112,112,125,0.15)', background: 'rgba(0,0,0,0.12)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold" style={{ color: '#f4f4f8' }}>{deal.property}</p>
                    <p className="mt-1 text-xs" style={{ color: '#8b8b9a' }}>{deal.firmName} · {deal.stage || 'No stage'}</p>
                  </div>
                  <span className="rounded-full px-2 py-1 text-xs" style={{ background: 'rgba(245,158,11,0.13)', color: '#fbbf24' }}>{deal.missing.length} gaps</span>
                </div>
                <p className="mt-2 text-xs" style={{ color: '#c3c3d0' }}>{deal.missing.join(', ')}</p>
              </div>
            ))}
            {blockedDeals === 0 && <p className="text-sm" style={{ color: '#8b8b9a' }}>No blocked records right now.</p>}
          </div>
        </div>
      </section>
    </div>
  )
}