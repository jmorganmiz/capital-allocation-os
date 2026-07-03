'use client'

import { useState } from 'react'

const views = ['Workstreams', 'Evidence review', 'IC package'] as const

const steps = [
  ['01', 'Deal intake', 'Complete', '7 core fields prepared'],
  ['02', 'Document inventory', 'Complete', '4 source documents indexed'],
  ['03', 'Financial baseline', 'Complete', 'Quick Pencil linked'],
  ['04', 'Comparable memory', 'Complete', '8 firm deals found'],
  ['05', 'Assumption gaps', 'Review', '3 inputs need approval'],
  ['06', 'Risk review', 'Review', 'Narrative needs approval'],
  ['07', 'Scenario summary', 'Complete', 'Three cases reconciled'],
  ['08', 'IC readiness', 'Review', '2 items block readiness'],
]

const scenarios = [
  ['Downside', '18.2%', '2.24x', '1.74x'],
  ['Base', '35.4%', '4.16x', '2.12x'],
  ['Upside', '41.4%', '5.04x', '2.19x'],
]

export function UnderwritingShowcase() {
  const [view, setView] = useState<(typeof views)[number]>('Workstreams')

  return (
    <section className="section underwriting-showcase reveal" id="underwriting">
      <div className="underwriting-copy">
        <div>
          <div className="sec-eye">Underwriting Pro</div>
          <h2 className="sec-title">A model your team can inspect. <strong>Not a black box.</strong></h2>
        </div>
        <p className="sec-sub">Dealstash connects cited document facts, firm memory, deterministic returns, and human approvals in one reviewable underwriting room.</p>
      </div>

      <div className="uw-stage">
        <div className="uw-stage-bar">
          <div className="uw-stage-dots" aria-hidden="true"><span /><span /><span /></div>
          <span>4810 Gaston Ave · Underwriting room</span>
          <div className="uw-live"><i /> Review required</div>
        </div>

        <div className="uw-stage-tabs" aria-label="Underwriting preview views">
          {views.map((item) => (
            <button key={item} type="button" className={view === item ? 'active' : ''} onClick={() => setView(item)}>{item}</button>
          ))}
        </div>

        {view === 'Workstreams' && (
          <div className="uw-workstream-view">
            <div className="uw-progress-row">
              <div><strong>5 complete · 3 review</strong><span>Preflight finished — analyst action required</span></div>
              <div className="uw-progress-track"><span /></div>
              <b>3 flagged</b>
            </div>
            <div className="uw-workstream-body">
              <div className="uw-step-grid">
                {steps.map(([num, title, status, detail]) => (
                  <div className={`uw-step ${status === 'Review' ? 'review' : ''}`} key={num}>
                    <span>{num}</span>
                    <div><strong>{title}</strong><p>{detail}</p></div>
                    <small>{status}</small>
                  </div>
                ))}
              </div>
              <EvidenceCard />
            </div>
          </div>
        )}

        {view === 'Evidence review' && (
          <div className="uw-evidence-view">
            <div className="uw-source-document">
              <div className="uw-doc-head"><span>Offering memorandum</span><b>Page 18 of 64</b></div>
              <div className="uw-doc-page">
                <small>PROJECTED OPERATING ASSUMPTIONS</small>
                <h3>Value-add renovation program</h3>
                <p>Management projects renovated units will achieve average monthly rents of $1,631 following a $12,000 per-unit interior program.</p>
                <mark>Exit valuation assumes a 5.75% terminal capitalization rate.</mark>
              </div>
            </div>
            <div className="uw-review-stack">
              <EvidenceCard expanded />
              <div className="uw-source-facts">
                <div><span>Current rent</span><strong>$1,456/mo</strong><small>Rent roll · 94% confidence</small></div>
                <div><span>Renovation cost</span><strong>$12,000/unit</strong><small>OM page 18 · 88% confidence</small></div>
              </div>
            </div>
          </div>
        )}

        {view === 'IC package' && (
          <div className="uw-ic-view">
            <div className="uw-ic-heading">
              <div><small>Investment committee</small><h3>4810 Gaston Ave</h3><p>Dallas, TX · 12 units · Value-add multifamily</p></div>
              <div className="uw-ready"><span>IC readiness</span><strong>6 / 8</strong><small>2 open items</small></div>
            </div>
            <div className="uw-scenario-grid">
              {scenarios.map(([name, irr, multiple, dscr]) => (
                <div className={`uw-scenario ${name === 'Base' ? 'base' : ''}`} key={name}>
                  <span>{name}</span><strong>{irr}</strong><div><p>Equity multiple <b>{multiple}</b></p><p>Year 1 DSCR <b>{dscr}</b></p></div>
                </div>
              ))}
            </div>
            <div className="uw-ic-footer"><span>Every output retains its assumptions, approvals, model version, and source appendix.</span><b>IC memo · PDF</b></div>
          </div>
        )}
      </div>

      <div className="uw-principles">
        <div><span>01</span><strong>Deterministic math</strong><p>AI extracts and organizes. The financial model calculates.</p></div>
        <div><span>02</span><strong>Cited evidence</strong><p>Material inputs point back to the document and page.</p></div>
        <div><span>03</span><strong>Human approval</strong><p>No inferred assumption silently becomes underwriting truth.</p></div>
        <div><span>04</span><strong>Versioned decisions</strong><p>Every run, revision, and IC output remains reproducible.</p></div>
      </div>
    </section>
  )
}

function EvidenceCard({ expanded = false }: { expanded?: boolean }) {
  return (
    <aside className={`uw-evidence-card ${expanded ? 'expanded' : ''}`}>
      <div className="uw-evidence-label"><span>Live artifact</span><small>Needs review</small></div>
      <h3>Exit cap rate</h3>
      <p>Seller case uses a terminal cap below the firm&apos;s conservative Dallas baseline.</p>
      <div className="uw-evidence-value"><strong>5.75%</strong><span>OM · page 18<br />88% confidence</span></div>
      <div className="uw-evidence-actions" aria-label="Example analyst actions"><span>Approve</span><span>Revise</span><span>Reject</span></div>
    </aside>
  )
}
