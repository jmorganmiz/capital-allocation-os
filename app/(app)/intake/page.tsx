import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import InboxAddressCard from '@/components/intake/InboxAddressCard'
import SetupChecklist from '@/components/intake/SetupChecklist'
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
      .select('id, status, attempts, last_error, received_at, processed_at')
      .eq('firm_id', firmId)
      .order('received_at', { ascending: false })
      .limit(20),
    supabase.from('buy_boxes').select('id', { count: 'exact', head: true }).eq('firm_id', firmId),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('firm_id', firmId),
    supabase.from('deals').select('id', { count: 'exact', head: true }).eq('firm_id', firmId),
  ])

  const failedCount = (recentEvents ?? []).filter(event => event.status === 'failed').length

  return (
    <div className="mx-auto max-w-[1100px] px-12 py-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#ededf3', marginBottom: '4px' }}>Intake</h1>
          <p style={{ fontSize: '14px', color: '#70707d', marginBottom: '32px' }}>Bring new opportunities into {firm?.name ?? 'your firm'}.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/import/deals" className="btn-secondary">Import CSV</Link>
          <Link href="/pipeline?upload=1" className="btn-primary">Upload an OM</Link>
        </div>
      </div>

      <SetupChecklist
        hasInbox={!!firm?.inbox_email}
        hasBuyBox={(buyBoxCount ?? 0) > 0}
        hasDeal={(dealCount ?? 0) > 0}
        hasTeammate={(memberCount ?? 0) > 1}
      />

      {firm?.inbox_email ? (
        <InboxAddressCard address={firm.inbox_email} />
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your inbox address is still being provisioned. Refresh shortly or contact support if it does not appear.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
        {[
          { value: recentDeals?.length ?? 0, label: 'Recent emailed deals', alert: false },
          { value: (recentEvents ?? []).filter(e => e.status === 'processed').length, label: 'Emails processed', alert: false },
          { value: failedCount, label: 'Needs attention', alert: failedCount > 0 },
        ].map(({ value, label, alert }) => (
          <div key={label} style={{
            background: alert ? 'rgba(248,113,113,0.06)' : '#1e1e2a',
            border: alert ? '1px solid rgba(248,113,113,0.25)' : '1px solid rgba(112,112,125,0.18)',
            borderRadius: '6px', padding: '20px 24px',
          }}>
            <p style={{ fontSize: '32px', fontWeight: 300, color: alert ? '#f87171' : '#70707d', lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: '12px', color: '#70707d', marginTop: '4px' }}>{label}</p>
          </div>
        ))}
      </div>

      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#70707d' }}>Recent intake</h2>
          <Link href="/pipeline" style={{ fontSize: '13px', color: '#5266eb', textDecoration: 'none' }}>View pipeline</Link>
        </div>
        {(recentDeals ?? []).length === 0 ? (
          <div style={{ border: '1px dashed rgba(112,112,125,0.25)', borderRadius: '8px', padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                style={{ color: '#272735' }}>
                <path d="M4 4h16a2 2 0 0 1 2 2v1.5L12 13 2 7.5V6a2 2 0 0 1 2-2z" stroke="#70707d" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M2 7.5v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7.5L12 13 2 7.5z" stroke="#70707d" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{ fontSize: '15px', fontWeight: 500, color: '#70707d', marginTop: '12px' }}>No emailed deals yet</p>
            <p style={{ fontSize: '13px', color: '#70707d', marginTop: '6px' }}>Forward a broker email with a PDF OM to your firm inbox to test the workflow.</p>
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
