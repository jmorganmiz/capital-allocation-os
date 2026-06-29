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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Intake</h1>
          <p className="mt-0.5 text-sm text-gray-500">Bring new opportunities into {firm?.name ?? 'your firm'}.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/import/deals" className="btn-secondary">Import CSV</Link>
          <Link href="/pipeline" className="btn-primary">Upload an OM</Link>
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

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold text-gray-900">{recentDeals?.length ?? 0}</p>
          <p className="mt-1 text-sm text-gray-500">Recent emailed deals</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold text-gray-900">{(recentEvents ?? []).filter(event => event.status === 'processed').length}</p>
          <p className="mt-1 text-sm text-gray-500">Emails processed</p>
        </div>
        <div className={`rounded-lg border p-4 ${failedCount ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
          <p className={`text-2xl font-bold ${failedCount ? 'text-red-700' : 'text-gray-900'}`}>{failedCount}</p>
          <p className="mt-1 text-sm text-gray-500">Needs attention</p>
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Recent intake</h2>
          <Link href="/pipeline" className="text-sm font-medium text-blue-600 hover:underline">View pipeline</Link>
        </div>
        {(recentDeals ?? []).length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-700">No emailed deals yet</p>
            <p className="mt-1 text-sm text-gray-400">Forward a broker email with a PDF OM to your firm inbox to test the workflow.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                <tr><th className="px-4 py-3 font-medium">Deal</th><th className="px-4 py-3 font-medium">Stage</th><th className="px-4 py-3 font-medium">AI score</th><th className="px-4 py-3 font-medium">Received</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(recentDeals ?? []).map((deal: any) => {
                  const scores = (deal.deal_scores ?? []).map((row: any) => Number(row.score)).filter(Boolean)
                  const score = calculateOverallScore(scores)
                  return (
                    <tr key={deal.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><Link href={`/deals/${deal.id}`} className="font-medium text-gray-900 hover:text-blue-700">{deal.title}</Link><p className="text-xs text-gray-400">{[deal.market, deal.deal_type].filter(Boolean).join(' · ') || 'Details pending review'}</p></td>
                      <td className="px-4 py-3 text-gray-600">{deal.deal_stages?.name ?? 'Unstaged'}</td>
                      <td className="px-4 py-3">{score === null ? <span className="text-amber-600">Pending</span> : <span className="font-semibold text-gray-900">{score}/100</span>}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(deal.created_at)}</td>
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
