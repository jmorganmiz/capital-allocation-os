import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getInternalContext, can } from '@/lib/internal/auth'
import { getAccessState } from '@/lib/workflow.mjs'
import SalesAccountForm from '@/components/internal/SalesAccountForm'
import CompToggle from '@/components/internal/CompToggle'

const MONTHLY_PRICE = 149
const QUIET_DAYS = 14

function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`
}

export default async function InternalOpsPage() {
  const context = await getInternalContext()
  if (!context || !can(context, 'ops')) notFound()

  // Employees see ops activity but not revenue dollars.
  const showRevenue = context.role !== 'employee'

  // Cross-tenant SaaS metrics require the service role; access was checked above.
  const admin = createAdminClient()
  const [{ data: firms }, { data: recentDeals }, { data: accounts }] = await Promise.all([
    admin.from('firms').select('id, name, created_at, trial_ends_at, stripe_subscription_status, stripe_cancel_at_period_end, comp_access'),
    admin.from('deals').select('firm_id, updated_at').order('updated_at', { ascending: false }).limit(2000),
    context.supabase.from('sales_accounts').select('*, internal_users(full_name)').order('last_activity_at', { ascending: false }).limit(50),
  ])

  const now = Date.now()
  const paying = (firms ?? []).filter((firm) => firm.stripe_subscription_status === 'active')
  const trialing = (firms ?? []).filter((firm) => {
    if (firm.stripe_subscription_status === 'active') return false
    return getAccessState({ trialEndsAt: firm.trial_ends_at, subscriptionStatus: firm.stripe_subscription_status }).trialActive
  })
  const churning = paying.filter((firm) => firm.stripe_cancel_at_period_end)
  const newSignups30d = (firms ?? []).filter((firm) => now - new Date(firm.created_at).getTime() < 30 * 86_400_000)

  const lastDealByFirm = new Map<string, number>()
  for (const deal of recentDeals ?? []) {
    if (!lastDealByFirm.has(deal.firm_id)) lastDealByFirm.set(deal.firm_id, new Date(deal.updated_at).getTime())
  }
  const health = (firms ?? []).map((firm) => {
    const lastDeal = lastDealByFirm.get(firm.id) ?? null
    const daysQuiet = lastDeal ? Math.floor((now - lastDeal) / 86_400_000) : null
    return { ...firm, daysQuiet, quiet: daysQuiet === null || daysQuiet >= QUIET_DAYS }
  }).sort((a, b) => (b.daysQuiet ?? 9999) - (a.daysQuiet ?? 9999))

  const metrics = [
    ...(showRevenue ? [{ label: 'MRR', value: money(paying.length * MONTHLY_PRICE) }] : []),
    { label: 'Paying firms', value: String(paying.length) },
    { label: 'Active trials', value: String(trialing.length) },
    { label: 'New signups (30d)', value: String(newSignups30d.length) },
    { label: 'Scheduled cancellations', value: String(churning.length) },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#f4f4f8' }}>Ops</h1>
        <p className="mt-1 text-sm" style={{ color: '#8b8b9a' }}>Dealstash sales pipeline, revenue, and customer health.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border p-4" style={{ borderColor: 'rgba(112,112,125,0.25)', background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xl font-bold" style={{ color: '#f4f4f8' }}>{metric.value}</p>
            <p className="mt-1 text-xs" style={{ color: '#8b8b9a' }}>{metric.label}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-base font-semibold" style={{ color: '#f4f4f8' }}>Sales pipeline</h2>
        {can(context, 'ops', 'write') && <SalesAccountForm />}
        <div className="mt-3 overflow-x-auto rounded-lg border" style={{ borderColor: 'rgba(112,112,125,0.25)' }}>
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                {['Account', 'Stage', ...(showRevenue ? ['Monthly value'] : []), 'Owner', 'Last activity'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: '#8b8b9a', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(accounts ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-sm" style={{ color: '#8b8b9a' }}>No accounts tracked yet.</td></tr>
              )}
              {(accounts ?? []).map((account: any) => (
                <tr key={account.id} style={{ borderTop: '1px solid rgba(112,112,125,0.15)' }}>
                  <td className="px-4 py-3" style={{ color: '#f4f4f8' }}>{account.company_name}</td>
                  <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>{account.stage}</td>
                  {showRevenue && <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>{account.monthly_value ? money(Number(account.monthly_value)) : '—'}</td>}
                  <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>{account.internal_users?.full_name ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: '#8b8b9a' }}>{new Date(account.last_activity_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold" style={{ color: '#f4f4f8' }}>Customer health</h2>
        <p className="mt-1 text-xs" style={{ color: '#8b8b9a' }}>Firms ranked by inactivity; quiet = no deal touched in {QUIET_DAYS}+ days.</p>
        <div className="mt-3 overflow-x-auto rounded-lg border" style={{ borderColor: 'rgba(112,112,125,0.25)' }}>
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                {['Firm', 'Status', 'Last deal activity', 'Health', ...(can(context, 'ops', 'write') ? ['Access'] : [])].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: '#8b8b9a', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {health.map((firm) => (
                <tr key={firm.id} style={{ borderTop: '1px solid rgba(112,112,125,0.15)' }}>
                  <td className="px-4 py-3" style={{ color: '#f4f4f8' }}>{firm.name}</td>
                  <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>{firm.comp_access ? 'comped' : firm.stripe_subscription_status ?? 'trial'}</td>
                  <td className="px-4 py-3" style={{ color: '#c3c3d0' }}>
                    {firm.daysQuiet === null ? 'never' : firm.daysQuiet === 0 ? 'today' : `${firm.daysQuiet}d ago`}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2 py-0.5 text-xs" style={firm.quiet
                      ? { background: 'rgba(248,113,113,0.15)', color: '#f87171' }
                      : { background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
                      {firm.quiet ? 'Going quiet' : 'Active'}
                    </span>
                  </td>
                  {can(context, 'ops', 'write') && (
                    <td className="px-4 py-3">
                      <CompToggle firmId={firm.id} comped={Boolean(firm.comp_access)} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
