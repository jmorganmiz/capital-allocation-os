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

const pipelineDeals: Record<string, (string | number)[][]> = {
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

type ScoringCriterion = { label: string; rating: number }

interface DealInfo {
  name: string
  address: string
  market: string
  assetType: string
  score: number
  stage: string
  ask: string
  noi: string
  capRate: string
  pricePerUnit: string
  units: number | string
  strategy: string
  broker: string
  scoring: ScoringCriterion[]
  overview: string
  risks: string
}

const dealDetailMap: Record<string, DealInfo> = {
  '4810 Gaston Ave': {
    name: '4810 Gaston Ave',
    address: '4810 Gaston Ave, Dallas, TX 75246',
    market: 'Dallas, TX',
    assetType: 'Multifamily',
    score: 82,
    stage: 'New',
    ask: '$1,050,000',
    noi: '$65,100',
    capRate: '6.2%',
    pricePerUnit: '$87,500',
    units: 12,
    strategy: 'Value-add MF',
    broker: 'Marcus Webb / CBRE',
    scoring: [
      { label: 'Location Grade', rating: 4 },
      { label: 'Tenant Quality', rating: 3 },
      { label: 'Lease Term Remaining', rating: 3 },
      { label: 'Debt Coverage Ratio', rating: 2 },
      { label: 'Cap Rate vs Threshold', rating: 4 },
      { label: 'Market Demand', rating: 3 },
    ],
    overview: '12-unit value-add multifamily in East Dallas. Below-market rents with ~22% upside to market. Seller underwriting appears aggressive on post-reno rents.',
    risks: 'Deferred maintenance reserve may be understated. Verify rent roll quality before LOI.',
  },
  'Bishop Arts Flats': {
    name: 'Bishop Arts Flats',
    address: '412 N Bishop Ave, Dallas, TX 75208',
    market: 'Dallas, TX',
    assetType: 'Mixed-use',
    score: 68,
    stage: 'Screening',
    ask: '$840,000',
    noi: '$48,720',
    capRate: '5.8%',
    pricePerUnit: '$105,000',
    units: 8,
    strategy: 'Mixed-use',
    broker: 'Jennifer Liu / JLL',
    scoring: [
      { label: 'Location Grade', rating: 4 },
      { label: 'Tenant Quality', rating: 4 },
      { label: 'Lease Term Remaining', rating: 3 },
      { label: 'Debt Coverage Ratio', rating: 3 },
      { label: 'Cap Rate vs Threshold', rating: 3 },
      { label: 'Market Demand', rating: 3 },
    ],
    overview: '8-unit mixed-use in Bishop Arts District. Strong foot traffic and retail demand. Below-market cap rate relative to firm threshold.',
    risks: 'Cap rate below threshold at 5.8%. Ground floor retail tenant on month-to-month lease creates rollover exposure.',
  },
  'Trinity Duplex Pack': {
    name: 'Trinity Duplex Pack',
    address: 'Multiple — Fort Worth, TX',
    market: 'Fort Worth, TX',
    assetType: 'SFR Pack',
    score: 47,
    stage: 'New',
    ask: '$620,000',
    noi: '$30,380',
    capRate: '4.9%',
    pricePerUnit: '$103,333',
    units: 6,
    strategy: 'SFR Pack',
    broker: 'David Park / Newmark',
    scoring: [
      { label: 'Location Grade', rating: 2 },
      { label: 'Tenant Quality', rating: 2 },
      { label: 'Lease Term Remaining', rating: 3 },
      { label: 'Debt Coverage Ratio', rating: 2 },
      { label: 'Cap Rate vs Threshold', rating: 1 },
      { label: 'Market Demand', rating: 3 },
    ],
    overview: '6-unit scattered-site duplex portfolio in Fort Worth. Mixed condition properties with management complexity.',
    risks: 'Cap rate far below threshold at 4.9%. Significant deferred maintenance. Scattered-site management adds operational overhead.',
  },
}

function buildGenericDeal(name: string): DealInfo {
  for (const [stage, deals] of Object.entries(pipelineDeals)) {
    for (const deal of deals) {
      const [dealName, market, type, score] = deal
      if (dealName === name) {
        return {
          name: dealName as string,
          address: `${dealName as string}, ${market as string}`,
          market: market as string,
          assetType: type as string,
          score: score as number,
          stage,
          ask: '—', noi: '—', capRate: '—', pricePerUnit: '—',
          units: '—', strategy: type as string, broker: '—',
          scoring: [], overview: '', risks: '',
        }
      }
    }
  }
  return {
    name, address: name, market: '—', assetType: '—', score: 0, stage: '—',
    ask: '—', noi: '—', capRate: '—', pricePerUnit: '—',
    units: '—', strategy: '—', broker: '—', scoring: [], overview: '', risks: '',
  }
}

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

// ── INTAKE ────────────────────────────────────────────────────────────────────

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

// ── PIPELINE ──────────────────────────────────────────────────────────────────

function PipelinePanel() {
  const [selectedDealName, setSelectedDealName] = useState<string | null>(null)

  if (selectedDealName) {
    const deal = dealDetailMap[selectedDealName] ?? buildGenericDeal(selectedDealName)
    return <DealDetail key={selectedDealName} deal={deal} onBack={() => setSelectedDealName(null)} />
  }

  return (
    <div className="demo-kanban">
      {Object.entries(pipelineDeals).map(([column, deals]) => (
        <div className="kanban-column" key={column}>
          <div className="kanban-header">
            <span>{column}</span>
            <b>{deals.length}</b>
          </div>
          {deals.map(([name, market, type, score]) => (
            <div
              className="kanban-card"
              key={name as string}
              onClick={() => setSelectedDealName(name as string)}
            >
              <div className="kanban-card-top">
                <div>
                  <h3>{name as string}</h3>
                  <p>{market as string}</p>
                </div>
                <span className={`score-pill ${scoreClass(Number(score))}`}>{score as number}</span>
              </div>
              <span className="asset-tag">{type as string}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── DEAL DETAIL ───────────────────────────────────────────────────────────────

const detailTabNames = ['Financials', 'Scoring', 'Notes', 'Files', 'Contacts']

function DealDetail({ deal, onBack }: { deal: DealInfo; onBack: () => void }) {
  const [detailTab, setDetailTab] = useState(0)

  return (
    <div className="deal-detail">
      <button type="button" className="deal-back" onClick={onBack}>← Pipeline</button>

      <div className="deal-header">
        <div className="deal-header-left">
          <div className="deal-title">{deal.name}</div>
          <div className="deal-meta-row">
            <span>{deal.address}</span>
            <span className="deal-meta-sep">·</span>
            <span className="asset-tag" style={{ fontSize: '10px', padding: '2px 8px' }}>{deal.assetType}</span>
            <span className="deal-meta-sep">·</span>
            <span>{deal.broker}</span>
          </div>
        </div>
        <div className="deal-actions">
          <select className="stage-select" defaultValue={deal.stage}>
            {pipelineStages.map(s => <option key={s}>{s}</option>)}
          </select>
          <button type="button" className="kill-btn">Kill Deal</button>
        </div>
      </div>

      <div className="detail-tabs">
        {detailTabNames.map((tab, i) => (
          <button
            key={tab}
            type="button"
            className={`detail-tab ${detailTab === i ? 'active' : ''}`}
            onClick={() => setDetailTab(i)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="detail-content">
        {detailTab === 0 && <DetailFinancials deal={deal} />}
        {detailTab === 1 && <DetailScoring deal={deal} />}
        {detailTab === 2 && <DetailNotes deal={deal} />}
        {detailTab === 3 && <DetailFiles deal={deal} />}
        {detailTab === 4 && <DetailContacts deal={deal} />}
      </div>

      <DecisionLog deal={deal} />
    </div>
  )
}

function DetailFinancials({ deal }: { deal: DealInfo }) {
  return (
    <>
      <div className="stat-grid">
        <div className="stat-box"><div className="stat-label">Asking Price</div><div className="stat-value">{deal.ask}</div></div>
        <div className="stat-box"><div className="stat-label">NOI</div><div className="stat-value">{deal.noi}</div></div>
        <div className="stat-box"><div className="stat-label">Cap Rate</div><div className="stat-value">{deal.capRate}</div></div>
        <div className="stat-box"><div className="stat-label">Price / Unit</div><div className="stat-value">{deal.pricePerUnit}</div></div>
      </div>
      <div className="stat-grid">
        <div className="stat-box"><div className="stat-label">Units</div><div className="stat-value">{deal.units}</div></div>
        <div className="stat-box"><div className="stat-label">Strategy</div><div className="stat-value">{deal.strategy}</div></div>
        <div className="stat-box"><div className="stat-label">Market</div><div className="stat-value">{deal.market}</div></div>
        <div className="stat-box"><div className="stat-label">Broker</div><div className="stat-value">{deal.broker}</div></div>
      </div>
    </>
  )
}

function DetailScoring({ deal }: { deal: DealInfo }) {
  return (
    <>
      <div className="score-summary-row">
        <div className="score-big-num">{deal.score}</div>
        <div className="score-summary-meta">
          <div className="score-out-of">out of 100</div>
          <div className="score-bar-track">
            <div className="score-bar-fill" style={{ width: `${deal.score}%` }} />
          </div>
        </div>
      </div>
      {deal.scoring.length > 0 && (
        <>
          <div className="scored-count">8 of 8 criteria scored.</div>
          <div className="rating-list">
            {deal.scoring.map(({ label, rating }) => (
              <div className="rating-row" key={label}>
                <span className="rating-label">{label}</span>
                <div className="rating-btns">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" className={`rating-btn${n === rating ? ' selected' : ''}`}>{n}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="scoring-total-row">
            <span className="scoring-total-label">Total score</span>
            <span className="scoring-total-val">{deal.score}/100</span>
          </div>
        </>
      )}
    </>
  )
}

function DetailNotes({ deal }: { deal: DealInfo }) {
  return (
    <div className="notes-fields">
      <div>
        <div className="notes-field-label">Overview</div>
        <textarea className="notes-textarea" defaultValue={deal.overview} />
      </div>
      <div>
        <div className="notes-field-label">Risks</div>
        <textarea className="notes-textarea" defaultValue={deal.risks} />
      </div>
      <div>
        <div className="notes-field-label">Notes</div>
        <textarea className="notes-textarea" placeholder="General notes, meeting summaries, follow-ups..." />
      </div>
    </div>
  )
}

function DetailFiles({ deal }: { deal: DealInfo }) {
  const fileName = deal.name.replace(/\s+/g, '_') + '_OM.pdf'
  return (
    <div className="files-panel">
      <div className="file-row">
        <span className="file-name">{fileName}</span>
        <span className="file-meta">8.2 MB · Uploaded Jun 12</span>
        <a href="#" className="file-download" onClick={e => e.preventDefault()}>Download</a>
      </div>
      <button type="button" className="ghost-btn-sm">+ Upload File</button>
      <div className="file-empty">Drop files here or click to upload.</div>
    </div>
  )
}

function DetailContacts({ deal }: { deal: DealInfo }) {
  const parts = deal.broker.split(' / ')
  const brokerName = parts[0]
  const brokerFirm = parts[1] ?? deal.broker
  return (
    <div className="contacts-panel">
      <div className="contact-row">
        <div className="contact-info">
          <div className="contact-name">{brokerName}</div>
          <div className="contact-role">Broker · Source</div>
          <div className="contact-firm">{brokerFirm}</div>
        </div>
        <div className="contact-tags">
          <span className="tag tp">Broker</span>
          <span className="tag tg">Source</span>
        </div>
      </div>
      <button type="button" className="ghost-btn-sm">+ Add Contact</button>
    </div>
  )
}

function DecisionLog({ deal }: { deal: DealInfo }) {
  return (
    <div className="decision-log">
      <div className="decision-log-title">Decision Log</div>
      <div className="decision-entry">
        Jun 12 — Deal added to pipeline via firm inbox. OM parsed automatically. Score: {deal.score}/100.
      </div>
      <button type="button" className="ghost-btn-sm">+ Add Entry</button>
    </div>
  )
}

// ── DEAL SCORE ────────────────────────────────────────────────────────────────

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

// ── GRAVEYARD ─────────────────────────────────────────────────────────────────

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
          <div className="graveyard-row" key={property as string}>
            <span>{property as string}</span>
            <span>{market as string}</span>
            <span><em>{reason as string}</em></span>
            <span>{score as number}</span>
            <span>{date as string}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SIMILAR DEALS ─────────────────────────────────────────────────────────────

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
          <div className="similar-card" key={name as string}>
            <div>
              <h3>{name as string}</h3>
              <p>{note as string}</p>
              <small>{date as string}</small>
            </div>
            <div className="similar-meta">
              <b>{score as number}</b>
              <span className={outcome === 'Killed' ? 'outcome-killed' : 'outcome-advanced'}>{outcome as string}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── AI ANALYST ────────────────────────────────────────────────────────────────

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

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

function DashboardPanel() {
  return (
    <div className="dashboard-panel">
      <div className="dash-stat-row">
        <div className="dash-stat-card"><b>21</b><span>Active Deals</span></div>
        <div className="dash-stat-card"><b>15</b><span>Killed Deals</span></div>
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

// ── SETTINGS ──────────────────────────────────────────────────────────────────

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
          <a href="#" className="settings-link" onClick={e => e.preventDefault()}>Edit</a>
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
              <a href="#" className="settings-link-muted" onClick={e => e.preventDefault()}>Edit</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
