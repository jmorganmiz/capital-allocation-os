export function Features() {
  return (
    <section className="section reveal" id="features">
      <div className="sec-eye">Features</div>
      <h2 className="sec-title">Everything your acquisitions team needs. <strong>Nothing it doesn&apos;t.</strong></h2>
      <p className="sec-sub">Built specifically for 2–15 person CRE firms. Not watered-down enterprise software.</p>

      <div className="bento">
        <div className="bc wide">
          <div className="bc-icon">📋</div>
          <div className="bc-title">Deal Pipeline</div>
          <div className="bc-desc">Kanban-style pipeline with custom stages. Every live deal at a glance — who owns it, where it stands, what&apos;s next.</div>
          <div className="mini-deal">
            <div><div className="md-name">4810 Gaston Ave — Dallas, TX</div><div className="md-meta">12 units · $1.05M · Cap 6.2%</div></div>
            <span className="tag tp">Initial Review</span>
          </div>
          <div className="mini-deal">
            <div><div className="md-name">Oak Cliff 24-Unit — Dallas, TX</div><div className="md-meta">24 units · $2.1M · Cap 5.8%</div></div>
            <span className="tag ta">LOI Submitted</span>
          </div>
          <div className="mini-deal">
            <div><div className="md-name">Garland Flats — Garland, TX</div><div className="md-meta">8 units · $680K · Cap 5.1%</div></div>
            <span className="tag tr">Killed</span>
          </div>
        </div>

        <div className="bc tall">
          <div className="bc-icon">🤖</div>
          <div className="bc-title">AI Analyst</div>
          <div className="bc-desc">Ask your firm&apos;s entire deal history anything. Instant recall across every deal you&apos;ve ever reviewed.</div>
          <div className="chat-wrap">
            <div className="cbubble cu">Why do Dallas deals keep failing our buy box?</div>
            <div className="cbubble ca">Of 14 Dallas deals reviewed, 9 were killed for sub-6% cap rates. Asking prices in East Dallas rose ~18% since Q3 — same assets now trade at a premium to your model.</div>
            <div className="cbubble cu">How many deals from this broker?</div>
            <div className="cbubble ca">5 deals from Marcus Webb at CBRE. 1 advanced to LOI. 4 killed — 2 on price, 1 deferred maintenance, 1 tenant rollover. Avg score: 67.</div>
          </div>
        </div>

        <div className="bc">
          <div className="bc-icon">🪦</div>
          <div className="bc-title">Deal Graveyard</div>
          <div className="bc-desc">Every deal you&apos;ve killed, with the exact reason. Searchable forever.</div>
          <div style={{ marginTop: '18px' }}>
            <div className="grave-row"><span style={{ color: 'var(--silver)' }}>Cap rate below threshold</span><span style={{ color: '#f87171', fontWeight: 600, fontSize: '13px' }}>12</span></div>
            <div className="grave-row"><span style={{ color: 'var(--silver)' }}>Tenant rollover risk</span><span style={{ color: '#f87171', fontWeight: 600, fontSize: '13px' }}>7</span></div>
            <div className="grave-row"><span style={{ color: 'var(--silver)' }}>Deferred maintenance</span><span style={{ color: '#f87171', fontWeight: 600, fontSize: '13px' }}>4</span></div>
            <div className="grave-row"><span style={{ color: 'var(--silver)' }}>Seller retrade</span><span style={{ color: '#f87171', fontWeight: 600, fontSize: '13px' }}>3</span></div>
          </div>
        </div>

        <div className="bc">
          <div className="bc-icon">🔍</div>
          <div className="bc-title">Similar Deals</div>
          <div className="bc-desc">See what you did with comparable assets before making the call on a new one.</div>
          <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="mini-deal"><span style={{ color: 'var(--silver)' }}>Garland 10-Unit</span><span className="tag tr">Killed</span></div>
            <div className="mini-deal"><span style={{ color: 'var(--silver)' }}>Mesquite 8-Unit</span><span className="tag tr">Killed</span></div>
            <div className="mini-deal"><span style={{ color: 'var(--silver)' }}>Oak Cliff 12-Unit</span><span className="tag tg">Advanced</span></div>
          </div>
        </div>

        <div className="bc wide memory-loop-card">
          <div className="bc-icon">↻</div>
          <div className="bc-title">Learning Loops</div>
          <div className="bc-desc">Approved corrections, partner decisions, and firm rules become context for the next review—without silently rewriting historical records.</div>
          <div className="memory-loop-flow">
            <span>Analyst correction</span><i>→</i><span>Partner approval</span><i>→</i><span>Firm memory</span><i>→</i><span>Next deal</span>
          </div>
        </div>

        <div className="bc decision-graph-card">
          <div className="bc-icon">⌁</div>
          <div className="bc-title">Decision Graph</div>
          <div className="bc-desc">Connect every property, broker, source, assumption, underwrite, and outcome into one firm-scoped record.</div>
          <div className="decision-nodes" aria-hidden="true">
            <span>Broker</span><span>Deal</span><span>Evidence</span><span>Decision</span>
          </div>
        </div>
      </div>
    </section>
  )
}
