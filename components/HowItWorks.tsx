export function HowItWorks() {
  return (
    <section className="section reveal" id="how">
      <div className="sec-eye">How it works</div>
      <h2 className="sec-title">From broker email to firm memory <strong>in seconds.</strong></h2>
      <p className="sec-sub">One automated flow from inbox to institutional knowledge. No manual entry, no spreadsheet toggling.</p>

      <div className="workflow reveal-stagger">
        <div className="wf-step">
          <div className="wf-num">📧</div>
          <div className="wf-label">OM Arrives</div>
          <div className="wf-desc">Broker sends to your firm inbox</div>
        </div>
        <div className="wf-step">
          <div className="wf-num">⚡</div>
          <div className="wf-label">Auto-Parsed</div>
          <div className="wf-desc">Address, NOI, cap rate, price extracted instantly</div>
        </div>
        <div className="wf-step">
          <div className="wf-num">🎯</div>
          <div className="wf-label">Buy Box Scored</div>
          <div className="wf-desc">AI scores against your criteria, not generic benchmarks</div>
        </div>
        <div className="wf-step">
          <div className="wf-num">📋</div>
          <div className="wf-label">Pipeline Added</div>
          <div className="wf-desc">Deal card created, stages tracked, team notified</div>
        </div>
        <div className="wf-step">
          <div className="wf-num">🔍</div>
          <div className="wf-label">Comps Surfaced</div>
          <div className="wf-desc">Similar past deals surface automatically</div>
        </div>
        <div className="wf-step">
          <div className="wf-num">🧠</div>
          <div className="wf-label">Decision Logged</div>
          <div className="wf-desc">Advance or kill. Reason recorded forever.</div>
        </div>
      </div>
    </section>
  )
}
