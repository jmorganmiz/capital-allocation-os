import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import InboxAddressCard from '@/components/intake/InboxAddressCard'
import SetupChecklist from '@/components/intake/SetupChecklist'
import IntakeHealthLog, { type IntakeEvent } from '@/components/intake/IntakeHealthLog'
import { calculateOverallScore } from '@/lib/workflow.mjs'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default async function IntakePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, firms(name, inbox_email)')
    .eq('id', user?.id ?? '')
    .single()

  const firm = profile?.firms as { name?: string; inbox_email?: string | null } | null
  const firmId = profile?.firm_id ?? ''
  const [{ data: recentDeals }, { data: recentEvents }, { count: buyBoxCount }, { count: memberCount }, { count: dealCount }] = await Promise.all([
    supabase
      .from('deals')
      .select('id, title, market, deal_type, created_at, stage_id, deal_stages(name), deal_scores(score)')
      .eq('firm_id', firmId)
      .eq('intake_type', 'email')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('inbound_email_events')
      .select('id, status, attempts, last_error, received_at, processed_at, sender, subject, attachment_count, deal_ids')
      .eq('firm_id', firmId)
      .order('received_at', { ascending: false })
      .limit(100),
    supabase.from('buy_boxes').select('id', { count: 'exact', head: true }).eq('firm_id', firmId),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('firm_id', firmId),
    supabase.from('deals').select('id', { count: 'exact', head: true }).eq('firm_id', firmId),
  ])

  const events = (recentEvents ?? []) as IntakeEvent[]
  // Server-rendered operational window; recalculated once per request.
  // eslint-disable-next-line react-hooks/purity
  const weekStart = Date.now() - (7 * 24 * 60 * 60 * 1000)
  const weekEvents = events.filter(event => new Date(event.received_at).getTime() >= weekStart)
  const processedCount = weekEvents.filter(event => event.status === 'processed').length
  const failedCount = weekEvents.filter(event => event.status === 'failed').length
  const completedCount = processedCount + failedCount
  const successRate = completedCount > 0 ? Math.round((processedCount / completedCount) * 100) : 100

  return (
    <div className="app-page app-intake-page">
      <div className="app-page-header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="app-eyebrow">Intake</p>
          <h1 className="app-title">Opportunity intake</h1>
          <p className="app-subtitle">Bring new opportunities into {firm?.name ?? 'your firm'}.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/import/deals" className="btn-secondary">Import CSV</Link>
          <Link href="/pipeline?upload=1" className="btn-primary">Upload an OM</Link>
        </div>
      </div>

      <div className="app-intake-command-grid">
        <SetupChecklist
          hasInbox={!!firm?.inbox_email}
          hasBuyBox={(buyBoxCount ?? 0) > 0}
          hasDeal={(dealCount ?? 0) > 0}
          hasTeammate={(memberCount ?? 0) > 1}
        />

        {firm?.inbox_email ? (
          <InboxAddressCard address={firm.inbox_email} />
        ) : (
          <div className="app-intake-panel app-intake-provisioning">
            Your inbox address is still being provisioned. Refresh shortly or contact support if it does not appear.
          </div>
        )}
      </div>

      <div className="app-intake-metrics">
        {[
          { value: weekEvents.length, label: 'Emails received · 7 days', alert: false },
          { value: `${successRate}%`, label: 'Intake success rate', alert: successRate < 95 },
          { value: processedCount, label: 'Delivered to pipeline', alert: false },
          { value: failedCount, label: 'Needs attention', alert: failedCount > 0 },
        ].map(({ value, label, alert }) => (
          <div key={label} className="app-intake-metric" data-alert={alert ? 'true' : 'false'}>
            <p>{value}</p>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <IntakeHealthLog events={events.slice(0, 20)} />

      <section className="app-intake-panel app-intake-recent">
        <div className="app-intake-recent-header">
          <h2>Recent intake</h2>
          <Link href="/pipeline">View pipeline</Link>
        </div>
        {(recentDeals ?? []).length === 0 ? (
          <div className="app-intake-empty">
            <p>No emailed deals yet</p>
            <span>Forward a broker email with a PDF OM to your firm inbox to test the workflow.</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(112,112,125,0.18)' }}>
            <table className="w-full min-w-[680px] text-sm">
              <thead style={{ borderBottom: '1px solid rgba(112,112,125,0.15)', background: 'var(--graphite)' }}>
                <tr>
                  {['Deal', 'Stage', 'AI Score', 'Received'].map(h => (
                    <th key={h} className="px-5 py-3 text-left font-medium" style={{ fontSize: '11px', color: 'var(--lead)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(recentDeals ?? []).map((deal: any, i: number) => {
                  const scores = (deal.deal_scores ?? []).map((row: any) => Number(row.score)).filter(Boolean)
                  const score = calculateOverallScore(scores)
                  return (
                    <tr key={deal.id} style={{ borderTop: i > 0 ? '1px solid rgba(112,112,125,0.1)' : 'none', background: 'var(--midnight-slate)' }}>
                      <td className="px-5 py-4">
                        <Link href={`/deals/${deal.id}`} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--starlight)' }} className="hover:opacity-70 transition-opacity">{deal.title}</Link>
                        <p style={{ fontSize: '11px', color: 'var(--lead)', marginTop: '2px' }}>{[deal.market, deal.deal_type].filter(Boolean).join(' · ') || 'Details pending review'}</p>
                      </td>
                      <td className="px-5 py-4" style={{ fontSize: '13px', color: 'var(--silver)' }}>{deal.deal_stages?.name ?? 'Unstaged'}</td>
                      <td className="px-5 py-4">
                        {score === null
                          ? <span style={{ fontSize: '12px', color: '#fbbf24' }}>Pending</span>
                          : <span style={{ fontSize: '13px', fontWeight: 600, color: score >= 70 ? '#4ade80' : score >= 40 ? '#fbbf24' : '#f87171' }}>{score}/100</span>
                        }
                      </td>
                      <td className="px-5 py-4" style={{ fontSize: '12px', color: 'var(--lead)' }}>{formatDate(deal.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
