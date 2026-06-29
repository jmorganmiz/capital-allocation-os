export function HowItWorks() {
  const steps = [
    {
      num: '01',
      label: 'OM Arrives',
      desc: 'Broker sends to your firm inbox',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#ededf3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4.5" width="14" height="10" rx="1.5" />
          <polyline points="2,4.5 9,10.5 16,4.5" />
        </svg>
      ),
    },
    {
      num: '02',
      label: 'Auto-Parsed',
      desc: 'Address, NOI, cap rate, price extracted instantly',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#ededf3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="10.5,2 5.5,9 9,9 7.5,16 12.5,9 9,9" />
        </svg>
      ),
    },
    {
      num: '03',
      label: 'Buy Box Scored',
      desc: 'AI scores against your criteria, not generic benchmarks',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#ededf3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="9" r="7" />
          <circle cx="9" cy="9" r="3.5" />
          <circle cx="9" cy="9" r="1" fill="#ededf3" stroke="none" />
        </svg>
      ),
    },
    {
      num: '04',
      label: 'Pipeline Added',
      desc: 'Deal card created, stages tracked, team notified',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#ededf3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="4" height="14" rx="1" />
          <rect x="7" y="2" width="4" height="9" rx="1" />
          <rect x="12" y="2" width="4" height="11" rx="1" />
        </svg>
      ),
    },
    {
      num: '05',
      label: 'Comps Surfaced',
      desc: 'Similar past deals surface automatically',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#ededf3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7.5" cy="7.5" r="5" />
          <line x1="11.5" y1="11.5" x2="16" y2="16" />
        </svg>
      ),
    },
    {
      num: '06',
      label: 'Decision Logged',
      desc: 'Advance or kill. Reason recorded forever.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#ededf3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="9" r="7" />
          <polyline points="5.5,9 7.5,11.5 12.5,6.5" />
        </svg>
      ),
    },
  ]

  return (
    <section className="section reveal" id="how">
      <div className="sec-eye">How it works</div>
      <h2 className="sec-title">From broker email to firm memory <strong>in seconds.</strong></h2>
      <p className="sec-sub">One automated flow from inbox to institutional knowledge. No manual entry, no spreadsheet toggling.</p>

      <div className="workflow reveal-stagger">
        {steps.map(({ num, label, desc, icon }) => (
          <div className="wf-step" key={num}>
            <div className="wf-step-num">{num}</div>
            <div className="wf-icon">{icon}</div>
            <div className="wf-label">{label}</div>
            <div className="wf-desc">{desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
