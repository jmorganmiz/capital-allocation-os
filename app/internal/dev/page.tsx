import { notFound } from 'next/navigation'
import { getInternalContext, can } from '@/lib/internal/auth'

const VERCEL_PROJECT_ID = process.env.VERCEL_DASH_PROJECT_ID ?? 'prj_WIhx0y3WA2o5MVVeIKZ9MvuiKRgi'
const VERCEL_TEAM_ID = process.env.VERCEL_DASH_TEAM_ID ?? 'team_pU9exQael9hJpxtPwr5QPPvc'
const VERCEL_DASHBOARD_URL = 'https://vercel.com/jmorganmizs-projects/capital-allocation-os'

type VercelDeployment = {
  uid: string
  state: string
  created: number
  inspectorUrl: string | null
  meta?: { githubCommitMessage?: string; githubCommitSha?: string }
}

type VercelEnv = { key: string; target: string[] | string; type: string }

async function fetchVercel<T>(path: string): Promise<T | null> {
  const token = process.env.VERCEL_API_TOKEN
  if (!token) return null
  try {
    const response = await fetch(`https://api.vercel.com${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!response.ok) return null
    return await response.json() as T
  } catch {
    return null
  }
}

const STATE_COLORS: Record<string, { background: string; color: string }> = {
  READY: { background: 'rgba(74,222,128,0.12)', color: '#4ade80' },
  ERROR: { background: 'rgba(248,113,113,0.15)', color: '#f87171' },
  BUILDING: { background: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
  QUEUED: { background: 'rgba(255,255,255,0.08)', color: '#c3c3d0' },
  CANCELED: { background: 'rgba(255,255,255,0.08)', color: '#8b8b9a' },
}

export default async function InternalDevPage() {
  const context = await getInternalContext()
  if (!context || !can(context, 'dev')) notFound()

  const hasToken = Boolean(process.env.VERCEL_API_TOKEN)
  const showSecrets = can(context, 'secrets', 'full')

  const [deployments, envs, { data: agentRuns }] = await Promise.all([
    fetchVercel<{ deployments: VercelDeployment[] }>(`/v6/deployments?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_TEAM_ID}&limit=12`),
    showSecrets ? fetchVercel<{ envs: VercelEnv[] }>(`/v9/projects/${VERCEL_PROJECT_ID}/env?teamId=${VERCEL_TEAM_ID}`) : Promise.resolve(null),
    context.supabase.from('agent_runs').select('*').order('created_at', { ascending: false }).limit(50),
  ])

  const runs = agentRuns ?? []
  const dayAgo = Date.now() - 86_400_000
  const recentRuns = runs.filter((run) => new Date(run.created_at).getTime() > dayAgo)
  const failed24h = recentRuns.filter((run) => run.status === 'failed').length
  const latencies = recentRuns.map((run) => Number(run.latency_ms)).filter((value) => Number.isFinite(value) && value > 0)
  const avgLatency = latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#f4f4f8' }}>Dev / Build</h1>
        <p className="mt-1 text-sm" style={{ color: '#8b8b9a' }}>Deployments, the agent pipeline, and environment visibility.</p>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: '#f4f4f8' }}>Deployments</h2>
          <a href={VERCEL_DASHBOARD_URL} target="_blank" rel="noreferrer" className="rounded-md px-3 py-1.5 text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: '#c3c3d0' }}>
            Open Vercel (redeploy there) →
          </a>
        </div>
        {!hasToken ? (
          <div className="mt-3 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.08)', color: '#fbbf24' }}>
            Add a read-scope <code>VERCEL_API_TOKEN</code> to the project environment to see build history here.
          </div>
        ) : !deployments ? (
          <p className="mt-3 text-sm" style={{ color: '#f87171' }}>Could not reach the Vercel API — check the token&apos;s scope.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {deployments.deployments.map((deployment) => (
              <div key={deployment.uid} className="flex items-center gap-3 rounded-lg border px-4 py-2.5" style={{ borderColor: 'rgba(112,112,125,0.2)', background: 'rgba(255,255,255,0.02)' }}>
                <span className="rounded-full px-2 py-0.5 text-xs" style={STATE_COLORS[deployment.state] ?? STATE_COLORS.QUEUED}>{deployment.state}</span>
                <p className="min-w-0 flex-1 truncate text-sm" style={{ color: '#f4f4f8' }}>
                  {(deployment.meta?.githubCommitMessage ?? 'Manual deploy').split('\n')[0]}
                </p>
                <p className="text-xs" style={{ color: '#8b8b9a' }}>{new Date(deployment.created).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                {deployment.inspectorUrl && (
                  <a href={deployment.inspectorUrl} target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: '#c7d2fe' }}>logs</a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold" style={{ color: '#f4f4f8' }}>Agent pipeline</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Runs (24h)', value: String(recentRuns.length) },
            { label: 'Failed (24h)', value: String(failed24h) },
            { label: 'Avg latency', value: avgLatency ? `${(avgLatency / 1000).toFixed(1)}s` : '—' },
          ].map((metric) => (
            <div key={metric.label} className="rounded-lg border p-4" style={{ borderColor: 'rgba(112,112,125,0.25)', background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xl font-bold" style={{ color: '#f4f4f8' }}>{metric.value}</p>
              <p className="mt-1 text-xs" style={{ color: '#8b8b9a' }}>{metric.label}</p>
            </div>
          ))}
        </div>
        {runs.length === 0 ? (
          <div className="mt-3 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(112,112,125,0.25)', color: '#8b8b9a' }}>
            No agent runs recorded yet. The FastAPI pipeline needs to insert into <code>agent_runs</code> (deal_reference, agent_name, status, latency_ms) as it executes — a small change in the agent service repo.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border" style={{ borderColor: 'rgba(112,112,125,0.25)' }}>
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Agent', 'Deal', 'Status', 'Latency', 'When', 'Error'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: '#8b8b9a', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} style={{ borderTop: '1px solid rgba(112,112,125,0.15)' }}>
                    <td className="px-4 py-2.5" style={{ color: '#f4f4f8' }}>{run.agent_name}</td>
                    <td className="px-4 py-2.5" style={{ color: '#c3c3d0' }}>{run.deal_reference ?? '—'}</td>
                    <td className="px-4 py-2.5" style={{ color: run.status === 'failed' ? '#f87171' : run.status === 'success' ? '#4ade80' : '#c3c3d0' }}>{run.status}</td>
                    <td className="px-4 py-2.5" style={{ color: '#c3c3d0' }}>{run.latency_ms ? `${(run.latency_ms / 1000).toFixed(1)}s` : '—'}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: '#8b8b9a' }}>{new Date(run.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: '#f87171' }}>{run.error_detail ? run.error_detail.slice(0, 80) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showSecrets && (
        <section>
          <h2 className="text-base font-semibold" style={{ color: '#f4f4f8' }}>Environment (read-only)</h2>
          <p className="mt-1 text-xs" style={{ color: '#8b8b9a' }}>Values never leave Vercel; rotate from the Vercel dashboard.</p>
          {!hasToken ? (
            <p className="mt-3 text-sm" style={{ color: '#8b8b9a' }}>Requires <code>VERCEL_API_TOKEN</code>.</p>
          ) : !envs ? (
            <p className="mt-3 text-sm" style={{ color: '#8b8b9a' }}>The token does not have access to environment metadata — that is fine; use the Vercel dashboard.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border" style={{ borderColor: 'rgba(112,112,125,0.25)' }}>
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['Key', 'Value', 'Targets'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: '#8b8b9a', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {envs.envs.map((env) => (
                    <tr key={env.key} style={{ borderTop: '1px solid rgba(112,112,125,0.15)' }}>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: '#f4f4f8' }}>{env.key}</td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: '#8b8b9a' }}>••••••••</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: '#c3c3d0' }}>{Array.isArray(env.target) ? env.target.join(', ') : env.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold" style={{ color: '#f4f4f8' }}>DB admin</h2>
        <p className="mt-1 text-sm" style={{ color: '#8b8b9a' }}>
          Deferred by design — the highest-risk surface in the spec. Use the Supabase dashboard for now; a controlled read-only table browser can come later if the need is real.
        </p>
      </section>
    </div>
  )
}
