import Link from 'next/link'

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="hero-overlay" />

      <div className="floating-cards">
        <div className="fc fc-pipeline">
          <div className="fc-label">📋 Live pipeline</div>
          <div className="deal-row">
            <div>
              <div className="fc-title" style={{ fontSize: '11px' }}>4810 Gaston Ave</div>
              <div className="fc-meta">12 units · $1.05M</div>
            </div>
            <span className="tag tp">Review</span>
          </div>
          <div className="deal-row">
            <div>
              <div className="fc-title" style={{ fontSize: '11px' }}>Oak Cliff 24-Unit</div>
              <div className="fc-meta">24 units · $2.1M</div>
            </div>
            <span className="tag ta">LOI</span>
          </div>
          <div className="deal-row">
            <div>
              <div className="fc-title" style={{ fontSize: '11px' }}>Garland Flats</div>
              <div className="fc-meta">8 units · $680K</div>
            </div>
            <span className="tag tr">Killed</span>
          </div>
        </div>

        <div className="fc fc-score">
          <div className="fc-label">🎯 AI score</div>
          <div className="score-big">82</div>
          <div className="score-sub">Passes buy box ✓</div>
          <div className="fc-meta" style={{ marginTop: '8px', fontSize: '10px' }}>Cap 6.2% · Ask $1.05M · MF</div>
        </div>

        <div className="fc fc-ai">
          <div className="fc-label">🤖 AI analyst</div>
          <div className="fc-chat-q">Why do Dallas deals keep failing?</div>
          <div className="fc-chat-a">9 of 14 Dallas deals killed for sub-6% cap rates. Asking prices up ~18% since Q3.</div>
        </div>

        <div className="fc fc-similar">
          <div className="fc-label">🔍 Similar deals found — 3 matches</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
            <div style={{ flex: 1, background: 'rgba(39,39,53,0.8)', border: '1px solid rgba(112,112,125,0.2)', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--starlight)', marginBottom: '2px' }}>Garland 10-Unit</div>
              <div style={{ fontSize: '10px', color: 'var(--lead)' }}>2024 · Score 61</div>
              <span className="tag tr" style={{ marginTop: '4px', display: 'inline-block' }}>Killed</span>
            </div>
            <div style={{ flex: 1, background: 'rgba(39,39,53,0.8)', border: '1px solid rgba(112,112,125,0.2)', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--starlight)', marginBottom: '2px' }}>Mesquite 8-Unit</div>
              <div style={{ fontSize: '10px', color: 'var(--lead)' }}>2024 · Score 58</div>
              <span className="tag tr" style={{ marginTop: '4px', display: 'inline-block' }}>Killed</span>
            </div>
            <div style={{ flex: 1, background: 'rgba(39,39,53,0.8)', border: '1px solid rgba(112,112,125,0.2)', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--starlight)', marginBottom: '2px' }}>Oak Cliff 12</div>
              <div style={{ fontSize: '10px', color: 'var(--lead)' }}>2023 · Score 79</div>
              <span className="tag tg" style={{ marginTop: '4px', display: 'inline-block' }}>Advanced</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-content">
        <div className="hero-eyebrow">Built for CRE acquisition teams</div>
        <h1>Your firm&apos;s deal memory,<br /><strong>finally organized.</strong></h1>
        <p className="hero-sub">Broker sends an OM — it&apos;s parsed, scored, and in your pipeline automatically. Every deal your firm has ever touched, searchable in seconds.</p>
        <div className="hero-ctas">
          <Link className="btn-primary" href="/signup">Start free — no credit card</Link>
          <Link className="btn-ghost" href="/demo">▶ Watch 2-min demo</Link>
        </div>
        <p className="hero-proof">$149 / mo · Unlimited users · Cancel anytime</p>
      </div>

      <div className="scroll-hint">
        <div className="scroll-line" />
      </div>
    </section>
  )
}
