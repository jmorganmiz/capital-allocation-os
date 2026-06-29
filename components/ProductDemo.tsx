'use client'

import { useEffect, useState } from 'react'

const tabs = ['Intake', 'Pipeline', 'Deal Score', 'Graveyard', 'Similar Deals', 'AI Analyst', 'Dashboard', 'Settings']

const promptReplies = {
  'Have we seen this broker before?':
    'Yes. Marcus Webb at CBRE has sent 5 deals. One advanced to LOI; four were killed for price, cap rate, or deferred maintenance.',
  'Which markets fail our buy box most?':
    'Dallas has the highest failure rate in the last 90 days: 9 of 14 deals missed your cap-rate threshold or price-per-unit target.',
  'Summarize this OM':
    '4810 Gaston Ave is a 12-unit Dallas multifamily ask at $1.05M with a 6.2% cap rate. It fits value-add criteria and scores 82/100.',
  'Show deals we killed on price':
    'Recent price kills include Garland Flats, East Dallas 16, and Mesquite 8-Unit. Each missed your target by 11–18% on price per unit.',
}

const pipelineDeals = {
  New: [
    ['4810 Gaston Ave', 'Dallas, TX', 'Multifamily', 82],
    ['Bishop Arts Flats', 'Dallas, TX', 'Mixed-use', 68],
    ['Trinity Duplex Pack', 'Fort Worth, TX', 'SFR Pack', 47],
  ],
  Screening: [
    ['Oak Cliff 24-Unit', 'Dallas, TX', 'Multifamily', 74],
    ['Garland Garden', 'Garland, TX', 'Multifamily', 59],
  ],
  LOI: [
    ['Magnolia Commons', 'Fort Worth, TX', 'Retail', 77],
    ['Plano Flex Park', 'Plano, TX', 'Industrial', 64],
  ],
  'Due Diligence': [
    ['Cedar Hill Villas', 'Cedar Hill, TX', 'Multifamily', 88],
    ['Denton Storage', 'Denton, TX', 'Storage', 71],
  ],
}

const scoreCriteria = [
  ['Cap Rate', 8.7],
  ['Location', 8.1],
  ['Unit Count', 7.4],
  ['Price/Unit', 8.4],
  ['Value-Add Potential', 8.9],
]

const killedDeals = [
  ['Garland Flats', 'Garland, TX', 'Cap rate below threshold', 42, 'Jan 12'],
  ['East Dallas 16', 'Dallas, TX', 'Price too high', 51, 'Jan 18'],
  ['Mesquite 8-Unit', 'Mesquite, TX', 'Deferred maintenance', 58, 'Feb 02'],
  ['Irving Garden', 'Irving, TX', 'Tenant rollover', 49, 'Feb 11'],
  ['Lancaster Court', 'Lancaster, TX', 'Bad debt risk', 46, 'Mar 04'],
  ['Arlington Six', 'Arlington, TX', 'Seller retrade', 62, 'Mar 19'],
]

const killFilters = [
  { label: 'Pricing / Return Threshold', count: 7 },
  { label: 'Sponsor / Operator Quality', count: 4 },
  { label: 'Market / Location', count: 3 },
  { label: 'Deal Structure', count: 1 },
  { label: 'Other', count: 1 },
]

const killCategoryMap: Record<string, string[]> = {
  'Pricing / Return Threshold': ['Cap rate below threshold', 'Price too high'],
  'Sponsor / Operator Quality': ['Deferred maintenance', 'Tenant rollover', 'Bad debt risk'],
  'Market / Location': [],
  'Deal Structure': ['Seller retrade'],
  'Other': [],
}

const similarDeals = [
  ['Garland 10-Unit', 61, 'Killed', 'Killed on cap rate compression', 'Nov 2024'],
  ['Mesquite 8-Unit', 58, 'Killed', 'Deferred maintenance exceeded reserve', 'Dec 2024'],
  ['Oak Cliff 12-Unit', 79, 'Advanced', 'Advanced to LOI at revised basis', 'Aug 2024'],
]

const killBreakdown = [
  { label: 'Pricing / Return Threshold Not Met', deals: 7, pct: 44 },
  { label: 'Sponsor / Operator Quality', deals: 4, pct: 25 },
  { label: 'Market / Location Concerns', deals: 3, pct: 19 },
  { label: 'Other', deals: 2, pct: 12 },
]

const scoringCriteria = [
  'Location Grade',
  'Tenant Quality',
  'Lease Term Remaining',
  'Debt Coverage Ratio',
  'Cap Rate vs Threshold',
  'Market Demand',
]

const pipelineStages = ['New', 'Screening', 'Underwriting', 'LOI', 'Closed']

const baseMessages = [
  ['user', 'Why do Dallas deals keep failing our buy box?'],
  ['ai', '9 of 14 Dallas deals were killed for sub-6% cap rates. Asking prices are up roughly 18% since Q3.'],
  ['user', 'How does 4810 Gaston compare?'],
  ['ai', 'It is stronger than your Dallas average: 82 score, 6.2% cap, and value-add upside. Similar killed deals were below 60.'],
  ['user', 'What should we verify first?'],
  ['ai', 'Verify rent roll quality, deferred maintenance, and whether seller underwriting assumes post-renovation rents too aggressively.'],
]

function scoreClass(score: number) {
  if (score > 70) return 'score-good'
  if (score >= 50) return 'score-mid'
  return 'score-low'
}

export function ProductDemo() {
  const [active, setActive] = useState(0)
  const [messages, setMessages] = useState(baseMessages)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive(current => (current + 1) % tabs.length)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [active])

  function selectTab(index: number) {
    setActive(index)
  }

  function addPrompt(prompt: keyof typeof promptReplies) {
    setActive(5)
    setMessages(current => [...current, ['user', prompt], ['ai', promptReplies[prompt]]])
  }

  return (
    <section className="section demo-section reveal" id="demo">
      <div className="sec-eye">Product demo</div>
      <h2 className="sec-title">See it in action.</h2>
      <p className="sec-sub">Every feature, right here.</p>

      <div className="demo-window">
        <div className="demo-chrome">
          <div className="chrome-dots" aria-hidden="true">
            <span className="dot-red" />
            <span className="dot-amber" />
            <span className="dot-green" />
          </div>
          <div className="chrome-title">Dealstash — Demo</div>
        </div>

        <div className="demo-app">
          <aside className="demo-sidebar" aria-label="Product demo tabs">
            {tabs.map((tab, index) => (
              <button
                className={`demo-tab ${active === index ? 'active' : ''}`}
                key={tab}
                onClick={() => selectTab(index)}
                type="button"
              >
                {tab}
              </button>
            ))}
          </aside>

          <main className="demo-main">
            <div className="demo-panel" key={active}>
              {active === 0 && <IntakePanel />}
              {active === 1 && <PipelinePanel />}
              {active === 2 && <DealScorePanel />}
              {active === 3 && <GraveyardPanel />}
              {active === 4 && <SimilarDealsPanel />}
              {active === 5 && <AiAnalystPanel messages={messages} addPrompt={addPrompt} />}
              {active === 6 && <DashboardPanel />}
              {active === 7 && <SettingsPanel />}
            </div>
          </main>
        </div>
      </div>
    </section>
  )
}

function IntakePanel() {
  return (
    <div className="intake-panel">
      <div className="demo-kicker">Your Firm Deal Inbox</div>
      <div className="intake-inbox-box">
        <span className="intake-email">cornerstone@getdealstash.com</span>
        <button type="button" className="intake-copy-btn">Copy address</button>
      </div>
      <p className="intake-sub">Forward broker OMs here. Dealstash parses, scores, and adds them to your pipeline automatically.</p>

      <div className="intake-stat-row">
        <div className="intake-stat-box"><b>3</b><span>Recent emails</span></div>
        <div className="intake-stat-box"><b>12</b><span>Processed this month</span></div>
        <div className="intake-stat-box"><b>0</b><span>Needs attention</span></div>
      </div>

      <div className="demo-kicker">Recent Intake</div>
      <div className="intake-table">
        <div className="intake-row">
          <div className="intake-row-info">
            <div className="intake-sender">Marcus Webb · CBRE</div>
            <div className="intake-property">4810 Gaston Ave — Dallas, TX</div>
          </div>
          <div className="intake-time">2 min ago</div>
          <span className="tag tg">Parsed ✓</span>
        </div>
        <div className="intake-row">
          <div className="intake-row-info">
            <div className="intake-sender">Jennifer Liu · JLL</div>
            <div className="intake-property">Oak Cliff Portfolio</div>
          </div>
          <div className="intake-time">1 hr ago</div>
          <span className="tag tp">Scoring...</span>
        </div>
        <div className="intake-row">
          <div className="intake-row-info">
            <div className="intake-sender">David Park · Newmark</div>
            <div className="intake-property">Plano Industrial Pack</div>
          </div>
          <div className="intake-time">3 hr ago</div>
          <span className="tag tq">Queued</span>
        </div>
      </div>
    </div>
  )
}

function PipelinePanel() {
  return (
    <div className="demo-kanban">
      {Object.entries(pipelineDeals).map(([column, deals]) => (
        <div className="kanban-column" key={column}>
          <div className="kanban-header">
            <span>{column}</span>
            <b>{deals.length}</b>
          </div>
          {deals.map(([name, market, type, score]) => (
            <div className="kanban-card" key={name}>
              <div className="kanban-card-top">
                <div>
                  <h3>{name}</h3>
                  <p>{market}</p>
                </div>
                <span className={`score-pill ${scoreClass(Number(score))}`}>{score}</span>
              </div>
              <span className="asset-tag">{type}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function DealScorePanel() {
  return (
    <div className="score-view">
      <div className="score-property">
        <div className="demo-kicker">Current deal</div>
        <h3>4810 Gaston Ave — Dallas, TX</h3>
        <div className="property-grid">
          <div><span>Units</span><b>12</b></div>
          <div><span>Ask</span><b>$1.05M</b></div>
          <div><span>Cap rate</span><b>6.2%</b></div>
          <div><span>Strategy</span><b>Value-add multifamily</b></div>
        </div>
      </div>

      <div className="score-breakdown">
        {scoreCriteria.map(([label, score]) => (
          <div className="criterion" key={label}>
            <div className="criterion-label">
              <span>{label}</span>
              <b>{score}/10</b>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Number(score) * 10}%` }} />
            </div>
          </div>
        ))}
        <div className="total-score">
          <span>Total score</span>
          <b>82/100</b>
        </div>
      </div>
    </div>
  )
}

function GraveyardPanel() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  const visibleDeals = activeFilter && killCategoryMap[activeFilter].length > 0
    ? killedDeals.filter(([, , reason]) => killCategoryMap[activeFilter].includes(reason as string))
    : killedDeals

  return (
    <div>
      <div className="graveyard-filters">
        <div className="filter-pills">
          {killFilters.map(({ label, count }) => (
            <button
              key={label}
              type="button"
              className={`filter-pill ${activeFilter === label ? 'active' : ''}`}
              onClick={() => setActiveFilter(prev => prev === label ? null : label)}
            >
              {label} · {count}
            </button>
          ))}
        </div>
        <select className="market-dropdown" defaultValue="all">
          <option value="all">All Markets</option>
          <option value="dallas">Dallas, TX</option>
          <option value="fortworth">Fort Worth, TX</option>
        </select>
      </div>
      <div className="graveyard-table">
        <div className="graveyard-row graveyard-head">
          <span>Property</span>
          <span>Market</span>
          <span>Kill Reason</span>
          <span>Score</span>
          <span>Date</span>
        </div>
        {visibleDeals.map(([property, market, reason, score, date]) => (
          <div className="graveyard-row" key={property}>
            <span>{property}</span>
            <span>{market}</span>
            <span><em>{reason}</em></span>
            <span>{score}</span>
            <span>{date}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SimilarDealsPanel() {
  return (
    <div className="similar-view">
      <div className="current-deal-card">
        <div className="demo-kicker">Current deal</div>
        <h3>4810 Gaston Ave</h3>
        <p>Dallas, TX · 12 units · Score 82</p>
      </div>
      <div className="similar-line" aria-hidden="true" />
      <div className="similar-stack">
        {similarDeals.map(([name, score, outcome, note, date]) => (
          <div className="similar-card" key={name}>
            <div>
              <h3>{name}</h3>
              <p>{note}</p>
              <small>{date}</small>
            </div>
            <div className="similar-meta">
              <b>{score}</b>
              <span className={outcome === 'Killed' ? 'outcome-killed' : 'outcome-advanced'}>{outcome}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AiAnalystPanel({ messages, addPrompt }: { messages: string[][], addPrompt: (prompt: keyof typeof promptReplies) => void }) {
  return (
    <div className="ai-panel">
      <div className="ai-chat">
        {messages.map(([role, text], index) => (
          <div className={`ai-message ${role === 'user' ? 'user-message' : 'assistant-message'}`} key={`${role}-${index}`}>
            {text}
          </div>
        ))}
      </div>
      <div className="prompt-row">
        {(Object.keys(promptReplies) as Array<keyof typeof promptReplies>).map(prompt => (
          <button type="button" onClick={() => addPrompt(prompt)} key={prompt}>
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

function DashboardPanel() {
  return (
    <div className="dashboard-panel">
      <div className="dash-stat-row">
        <div className="dash-stat-card">
          <b>21</b>
          <span>Active Deals</span>
        </div>
        <div className="dash-stat-card">
          <b>15</b>
          <span>Killed Deals</span>
        </div>
      </div>
      <div className="demo-kicker" style={{ marginTop: '28px', marginBottom: '16px' }}>Kill Reason Breakdown</div>
      <div className="kill-breakdown">
        {killBreakdown.map(({ label, deals, pct }) => (
          <div className="kill-bar-row" key={label}>
            <div className="kill-bar-label">
              <span>{label}</span>
              <span className="kill-bar-meta">{deals} deals · {pct}%</span>
            </div>
            <div className="kill-bar-track">
              <div className="kill-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SettingsPanel() {
  return (
    <div className="settings-panel">
      <div className="settings-section">
        <div className="settings-section-title">Buy Box</div>
        <div className="buybox-card">
          <div>
            <div className="buybox-name">Multifamily</div>
            <div className="buybox-criteria">Cap Rate ≥ 6.0%</div>
            <div className="buybox-criteria">Max Price $5.0M</div>
          </div>
          <a href="#" className="settings-link">Edit</a>
        </div>
        <button type="button" className="settings-ghost-btn">+ New Buy Box</button>
      </div>

      <div className="settings-divider" />

      <div className="settings-section">
        <div className="settings-section-title">Scoring Criteria</div>
        <p className="settings-sub">AI scores every inbound deal against these criteria automatically.</p>
        <div className="scoring-list">
          {scoringCriteria.map((criterion, i) => (
            <div className="scoring-row" key={criterion}>
              <span className="scoring-num">{i + 1}</span>
              <span className="scoring-label">{criterion}</span>
              <span className="scoring-rate">Rate 1–5 per deal</span>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-divider" />

      <div className="settings-section">
        <div className="settings-section-title">Pipeline Stages</div>
        <div className="stages-list">
          {pipelineStages.map((stage, i) => (
            <div className="stage-row" key={stage}>
              <span className="scoring-num">{i + 1}</span>
              <span className="scoring-label">{stage}</span>
              <a href="#" className="settings-link-muted">Edit</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
