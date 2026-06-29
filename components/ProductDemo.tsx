'use client'

import { useEffect, useState } from 'react'

const tabs = ['Pipeline', 'Deal Score', 'Graveyard', 'Similar Deals', 'AI Analyst']

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

const similarDeals = [
  ['Garland 10-Unit', 61, 'Killed', 'Killed on cap rate compression', 'Nov 2024'],
  ['Mesquite 8-Unit', 58, 'Killed', 'Deferred maintenance exceeded reserve', 'Dec 2024'],
  ['Oak Cliff 12-Unit', 79, 'Advanced', 'Advanced to LOI at revised basis', 'Aug 2024'],
]

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
    setActive(4)
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
              {active === 0 && <PipelinePanel />}
              {active === 1 && <DealScorePanel />}
              {active === 2 && <GraveyardPanel />}
              {active === 3 && <SimilarDealsPanel />}
              {active === 4 && <AiAnalystPanel messages={messages} addPrompt={addPrompt} />}
            </div>
          </main>
        </div>
      </div>
    </section>
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
  return (
    <div className="graveyard-table">
      <div className="graveyard-row graveyard-head">
        <span>Property</span>
        <span>Market</span>
        <span>Kill Reason</span>
        <span>Score</span>
        <span>Date</span>
      </div>
      {killedDeals.map(([property, market, reason, score, date]) => (
        <div className="graveyard-row" key={property}>
          <span>{property}</span>
          <span>{market}</span>
          <span><em>{reason}</em></span>
          <span>{score}</span>
          <span>{date}</span>
        </div>
      ))}
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
