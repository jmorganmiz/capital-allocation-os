type Metrics = {
  runs: number
  facts: number
  reviewed: number
  approved: number
  rejected: number
  revised: number
  averageConfidence: number | null
}

export default function UnderwritingQualityLab({ metrics }: { metrics: Metrics }) {
  const reviewRate = metrics.facts ? Math.round((metrics.reviewed / metrics.facts) * 100) : 0
  const acceptanceRate = metrics.reviewed ? Math.round((metrics.approved / metrics.reviewed) * 100) : 0
  const runProgress = Math.min(100, Math.round((metrics.runs / 20) * 100))

  return (
    <section>
      <div className="app-settings-section-header">
        <div><p>Quality control</p><h2>Real-OM stress test</h2></div>
        <span>{metrics.runs} / 20 runs</span>
      </div>
      <p className="app-settings-section-copy">Production evidence only. Metrics come from cited facts that analysts actually approved, revised, or rejected.</p>
      <div className="app-quality-progress"><span style={{ width: `${runProgress}%` }} /></div>
      <div className="app-quality-grid">
        <div><strong>{metrics.facts}</strong><span>Cited facts</span></div>
        <div><strong>{reviewRate}%</strong><span>Reviewed</span></div>
        <div><strong>{acceptanceRate}%</strong><span>Accepted</span></div>
        <div><strong>{metrics.revised}</strong><span>Analyst revisions</span></div>
        <div><strong>{metrics.rejected}</strong><span>Rejected facts</span></div>
        <div><strong>{metrics.averageConfidence == null ? '—' : `${Math.round(metrics.averageConfidence * 100)}%`}</strong><span>Avg. confidence</span></div>
      </div>
      <p className="app-quality-note">Launch gate: 20 real runs, reviewed evidence coverage above 90%, and direct variable cost below 20% of plan revenue.</p>
    </section>
  )
}
