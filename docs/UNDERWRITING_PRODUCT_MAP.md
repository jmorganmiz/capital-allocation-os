# Dealstash Underwriting, Sourcing, and Decision Intelligence

Status: approved direction, phased implementation  
Initial wedge: U.S. multifamily value-add acquisitions  
Operating principle: every automated conclusion must be reproducible, sourced, and reviewable.

## Product thesis

Dealstash is not another pipeline or a generic AI calculator. It is a closed-loop acquisition system that connects discovery, underwriting, decisions, historical memory, and realized outcomes.

```text
Source -> Match -> Quick Pencil -> Full Underwrite -> IC Decision
  ^                                                   |
  |                                                   v
Actuals <- Portfolio learning <- Pipeline / Graveyard memory
```

The durable product advantage is the Decision Graph: a firm-scoped history connecting properties, brokers, markets, documents, assumptions, overrides, underwriting versions, decisions, and actual performance.

## Target customer

- Acquisition teams with roughly 2-20 users.
- Multifamily owner-operators, sponsors, and investment firms.
- Teams currently using email, spreadsheets, shared drives, and a lightweight CRM.
- Teams too sophisticated for a consumer calculator but underserved by enterprise implementations.

## Product modules

### 1. Deal Memory Core

- Firm inbox and OM ingestion.
- Pipeline and Graveyard.
- Contacts and broker history.
- Search across active and killed deals.
- Similar-deal retrieval.
- AI Analyst grounded in firm records.
- Learning from saved answers, corrections, and firm rules.

### 2. Quick Pencil

- Deterministic calculation only; no generative model required.
- Purchase basis, NOI, leverage, rate, amortization, IO period, rent growth, expense growth, hold, and exit cap.
- Levered and unlevered IRR, equity multiple, average cash-on-cash, DSCR, required equity, exit value, and loan payoff.
- Unlimited for firms entitled to Underwriting Pro.
- Results saved as versioned underwriting runs.

### 3. Full Underwrite

- OM, rent-roll, T-12, and supporting-document extraction.
- Unit mix and renovation schedule.
- Detailed operating statement normalization.
- Sources and uses, debt schedule, and annual/monthly cash flows.
- Base, downside, upside, and custom scenarios.
- Sensitivity tables and break-even analysis.
- Firm-template Excel export.
- Completed runs consume a customer-facing underwriting allowance.

### 4. Underwriting Room

The UI exposes real work without displaying hidden model reasoning.

- Durable run status and percentage complete.
- Agent/step cards: queued, running, needs review, complete, failed, canceled.
- Live structured artifacts: fields extracted, sources found, exceptions, confidence, elapsed time.
- Evidence panel linking each conclusion to a document page, public source, or firm rule.
- OM case versus conservative case comparison.
- Human approval gates for market-derived and AI-assumed inputs.
- Partial results remain visible when a non-critical step fails.
- Credits are reserved at start and settled only for completed billable work.

Initial run stages:

1. Normalize documents.
2. Reconcile rent roll.
3. Normalize operating history.
4. Verify market evidence.
5. Size debt.
6. Calculate scenarios.
7. Red-team risks and assumptions.
8. Generate IC package.

### 5. Investment Committee

- Decision summary, thesis, risks, mitigants, and open diligence.
- Assumption changes with return attribution.
- Similar historical deals and their outcomes.
- Approval record and decision log.
- Exportable memo, source appendix, and editable workbook.
- No AI-generated assumption becomes approved without an attributable human action.

### 6. Sourcing

Phase A, controlled ingestion:

- Broker emails.
- CSV and spreadsheet imports.
- User-submitted listing URLs.
- Existing historical deal imports.

Phase B, permitted discovery:

- Licensed listing and property-data feeds.
- Public property and ownership records where permitted.
- Saved-search alerts and broker-network signals.

Workflow:

1. Normalize address and APN.
2. Deduplicate against the Decision Graph.
3. Enrich the property and ownership record.
4. Match firm buy boxes.
5. Run a preliminary score and Quick Pencil.
6. Rank opportunities with an evidence-backed explanation.
7. Route selected opportunities into Full Underwrite.

Dealstash will not depend on unlicensed scraping of listing platforms.

### 7. Learning and calibration

- Learn from analyst overrides and partner approvals.
- Compare OM claims, initial assumptions, approved assumptions, and actual results.
- Detect recurring firm bias by market and assumption category.
- Track broker accuracy and missing-information patterns.
- Feed kill reasons and outcomes back into sourcing rankings.
- Surface resurrection alerts when price, terms, or market conditions change.

## Assumption provenance

Every material input carries:

- Value and normalized unit.
- Source type: OM stated, rent roll, T-12, public record, market-derived, AI-assumed, analyst override, or firm rule.
- Source reference and captured excerpt where permitted.
- Confidence.
- Effective date and freshness.
- Created by and approved by.
- Model and schema version.

## Decision Graph

Primary nodes:

- Firm, user, property, deal, contact, broker, company, market, document, source, assumption, scenario, underwriting run, decision, firm rule, portfolio asset, and actual observation.

Important edges:

- Property appeared in deal.
- Broker introduced property.
- Document supports assumption.
- User overrode assumption.
- Scenario produced output.
- Decision killed or advanced deal.
- Historical deal resembles current deal.
- Actual observation confirms or contradicts assumption.

Start relationally in Postgres. Do not add a graph database until query pressure proves it necessary.

## Billing model to validate in beta

| Plan | Monthly price | Included |
| --- | ---: | --- |
| Core | $149 | 3 seats, unlimited deals, Deal Memory, inbox, AI Analyst |
| Underwriting Pro | $399 | 5 seats, Core, unlimited Quick Pencils, 25 Full Underwrites |
| Scale | $749 | 10 seats, Pro, 75 Full Underwrites, sourcing workflows, priority processing |
| Additional seat | $49 | One user |
| Underwrite pack | $99 | 10 additional Full Underwrites |

Rules:

- Do not expose provider tokens as the customer billing unit.
- Meter provider tokens, searches, latency, retries, and estimated cost internally.
- Bill recognizable completed work.
- Deterministic recalculation does not consume an underwrite.
- A Full Underwrite includes an initial run, a defined revision allowance, and one IC package.
- Failed and canceled runs do not consume the full allowance.
- Proprietary third-party data pulls remain separately metered until contracts and margins are known.

Price gates before public launch:

- At least five design-partner interviews.
- At least twenty real underwriting runs.
- Median time-to-first-value below fifteen minutes.
- Direct variable cost below 20% of plan revenue at included usage.
- Clear willingness to pay at $399 from at least three target firms.

## Architecture

### Dealstash application

- Next.js product UI and server routes.
- Supabase Postgres, authentication, RLS, and document storage.
- Stripe subscriptions, seat quantities, entitlements, and usage meters.

### Underwriting core

- Deterministic, versioned calculation library.
- Strict schemas at every boundary.
- Golden-case tests against the source Excel model.
- No generative model is allowed to calculate financial outputs directly.

### Agent execution

- Durable queue and workers, not web-process background threads.
- Firm and user context required on every job.
- Service-to-service authentication required in every environment.
- Idempotent step execution and resumable runs.
- Structured outputs with schema validation.
- Retries bounded by step and error class.
- Per-step token, cost, source, and latency telemetry.

### Existing CRE-MF-VA-firm repository

Reuse after validation:

- Financial-model concepts and Excel workbook.
- Underwriting A/B framing.
- Market, risk, capital-stack, and IC memo prompts.

Do not merge directly:

- Separate dashboard.
- Global JSON persistence.
- Optional API authentication.
- Wildcard CORS.
- In-process daemon job execution.
- Unversioned mutable results.

## Data model additions

- `underwriting_runs`
- `underwriting_steps`
- `underwriting_scenarios`
- `underwriting_assumptions`
- `underwriting_outputs`
- `underwriting_sources`
- `underwriting_approvals`
- `usage_events`
- `firm_entitlements`
- `properties`
- `property_identifiers`
- `deal_property_links`
- `actual_observations`

All operational tables are firm-scoped with RLS. Usage events are append-only and carry idempotency keys.

## Release sequence

### Phase 0: mathematical trust

- Port the deterministic model.
- Correct amortizing loan payoff and partial IO periods.
- Validate against the Excel workbook and independent hand calculations.
- Add invalid-input, edge-case, and property-based tests.
- Document model limitations.

Exit gate: approved golden cases with explained tolerances.

### Phase 1: Quick Pencil beta

- Underwriting data schema and RLS.
- Versioned Quick Pencil on the deal page.
- Base/downside/upside scenarios.
- Output attribution and change explanation.
- Beta entitlement and usage ledger.

Exit gate: no unexplained calculation variance and no cross-firm access paths.

### Phase 2: Underwriting Room

- Durable job runner.
- Progress visualization and partial-result handling.
- Document extraction and reconciliation.
- Provenance and approval workflow.
- Agent disagreement view.

Exit gate: safe retry/resume behavior and truthful progress under forced failures.

### Phase 3: Full Underwrite and IC

- Detailed model.
- Sensitivities and break-even analysis.
- Excel export.
- Evidence-backed IC memo.
- Stripe entitlement and allowance enforcement.

Exit gate: design-partner approval on real deals and validated unit economics.

### Phase 4: Sourcing Inbox

- Listing URL and historical spreadsheet ingestion.
- Address/APN normalization and deduplication.
- Buy-box matching and ranking.
- Missing-information follow-up workflow.

Exit gate: precision measured against human triage, with false positives reviewed.

### Phase 5: Discovery and learning

- Licensed feeds.
- Decision Graph queries.
- Actual-versus-underwritten tracking.
- Firm calibration and resurrection alerts.

Exit gate: demonstrated improvement in ranking or forecast calibration from accumulated firm data.

## Continuous stress-test register

Review at every phase and before every release.

### Financial correctness

- Golden cases, independent calculations, boundary inputs, scenario monotonicity, debt payoff, negative cash flow, and multiple-IRR behavior.
- Model limitations displayed in product and exports.

### Trust and evidence

- Unsupported claims, stale sources, conflicting documents, missing fields, confidence calibration, and human approval paths.

### Security and tenancy

- RLS tests, service authentication, signed URLs, prompt-injection isolation, file validation, secrets, audit logs, and least privilege.

### Reliability

- Worker restart, duplicate delivery, partial failure, timeout, provider outage, retry storms, cancellation, idempotency, and backpressure.

### Billing

- Reservation and settlement, duplicate meter events, refunds on failure, seat changes, plan downgrade, trial expiry, and billing disputes.

### Economics

- Cost by run type, document size, model, data provider, retries, support burden, and heavy-user cohorts.

### Usability

- Time to first result, required inputs, empty states, mobile fallback, accessible progress, interruption recovery, and Excel handoff.

### Legal and data rights

- Listing-feed licenses, public-record terms, document retention, customer data isolation, model disclaimers, and export/deletion rights.

### Product focus

- Reject features that do not improve acquisition speed, decision quality, memory, or learning.
- Keep multifamily value-add deep before expanding asset classes.

## Current major risks

1. Financial outputs appear authoritative before the model is fully validated.
2. Broad asset-class support weakens the initial product.
3. Agent visuals become theater rather than useful progress.
4. Data licensing costs overwhelm AI costs.
5. Teams resist replacing their existing Excel model.
6. Long-running work fails without durable orchestration.
7. Historical data is too sparse to create early learning value.
8. Usage pricing creates anxiety or billing disputes.

## Mitigations

- Explicit beta and approval states.
- Multifamily-first scope.
- Excel interoperability.
- Truthful step telemetry and evidence artifacts.
- Controlled ingestion before licensed discovery.
- Included allowances rather than raw-token billing.
- Historical import and onboarding services to accelerate memory.
- Durable, idempotent execution before full automation.

## Decision log

- Use bundled seats plus underwriting allowances; do not expose raw tokens.
- Keep Core at $149 while validating a $399 Underwriting Pro plan.
- Quick Pencil is deterministic and unmetered within Pro.
- Full Underwrite is the billable unit.
- Build the experience natively in Dealstash; reuse validated logic, not the second application.
- Start with multifamily value-add.
- Use Postgres for the initial Decision Graph.
- Do not use unauthorized listing-platform scraping.
- Agent visuals display status, artifacts, evidence, and disagreement—not private chain-of-thought.

