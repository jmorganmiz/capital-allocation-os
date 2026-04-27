// Hardcoded seed data for demo mode — no Supabase queries

export const DEMO_STAGES = [
  { id: 'stage-new',            name: 'New',            position: 0, is_terminal: false, firm_id: 'demo', created_at: '2025-01-01T00:00:00Z' },
  { id: 'stage-screening',      name: 'Screening',      position: 1, is_terminal: false, firm_id: 'demo', created_at: '2025-01-01T00:00:00Z' },
  { id: 'stage-loi',            name: 'LOI',            position: 2, is_terminal: false, firm_id: 'demo', created_at: '2025-01-01T00:00:00Z' },
  { id: 'stage-due-diligence',  name: 'Due Diligence',  position: 3, is_terminal: false, firm_id: 'demo', created_at: '2025-01-01T00:00:00Z' },
  { id: 'stage-closed',         name: 'Closed',         position: 4, is_terminal: true,  firm_id: 'demo', created_at: '2025-01-01T00:00:00Z' },
]

export const DEMO_DEALS = [
  {
    id: 'deal-lakeview-commons',
    title: 'Lakeview Commons',
    market: 'Chicago, IL',
    deal_type: 'Multifamily',
    source_type: 'broker',
    source_name: 'Marcus Chen – JLL',
    stage_id: 'stage-new',
    is_archived: false,
    archived_at: null,
    owner_user_id: null,
    intake_type: null,
    firm_id: 'demo',
    created_by: 'demo',
    created_at: '2026-03-17T09:00:00Z',
    updated_at: '2026-03-17T09:00:00Z',
    latest_stage_event_at: '2026-03-17T09:00:00Z',
    owner: null,
  },
  {
    id: 'deal-thornton-business-park',
    title: 'Thornton Business Park',
    market: 'Denver, CO',
    deal_type: 'Industrial',
    source_type: 'broker',
    source_name: 'Marcus Chen – JLL',
    stage_id: 'stage-new',
    is_archived: false,
    archived_at: null,
    owner_user_id: null,
    intake_type: null,
    firm_id: 'demo',
    created_by: 'demo',
    created_at: '2026-03-18T11:00:00Z',
    updated_at: '2026-03-18T11:00:00Z',
    latest_stage_event_at: '2026-03-18T11:00:00Z',
    owner: null,
  },
  {
    id: 'deal-sunset-ridge',
    title: 'Sunset Ridge Apartments',
    market: 'Phoenix, AZ',
    deal_type: 'Multifamily',
    source_type: 'broker',
    source_name: 'Marcus Chen – JLL',
    stage_id: 'stage-screening',
    is_archived: false,
    archived_at: null,
    owner_user_id: null,
    intake_type: null,
    firm_id: 'demo',
    created_by: 'demo',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-02T09:00:00Z',
    latest_stage_event_at: '2026-03-02T09:00:00Z',
    owner: null,
  },
  {
    id: 'deal-harbor-view',
    title: 'Harbor View Office',
    market: 'San Diego, CA',
    deal_type: 'Office',
    source_type: 'broker',
    source_name: 'Amanda Torres – CBRE',
    stage_id: 'stage-loi',
    is_archived: false,
    archived_at: null,
    owner_user_id: null,
    intake_type: null,
    firm_id: 'demo',
    created_by: 'demo',
    created_at: '2026-02-20T09:00:00Z',
    updated_at: '2026-03-09T14:00:00Z',
    latest_stage_event_at: '2026-03-09T14:00:00Z',
    owner: { full_name: 'Alex Rivera' },
  },
  {
    id: 'deal-riverfront',
    title: 'Riverfront Retail Center',
    market: 'Austin, TX',
    deal_type: 'Retail',
    source_type: 'broker',
    source_name: 'Marcus Chen – JLL',
    stage_id: 'stage-due-diligence',
    is_archived: false,
    archived_at: null,
    owner_user_id: null,
    intake_type: null,
    firm_id: 'demo',
    created_by: 'demo',
    created_at: '2026-03-05T08:00:00Z',
    updated_at: '2026-03-14T11:00:00Z',
    latest_stage_event_at: '2026-03-14T11:00:00Z',
    owner: { full_name: 'Alex Rivera' },
  },
  {
    id: 'deal-cascade',
    title: 'Cascade Industrial Park',
    market: 'Portland, OR',
    deal_type: 'Industrial',
    source_type: 'broker',
    source_name: 'Marcus Chen – JLL',
    stage_id: 'stage-due-diligence',
    is_archived: false,
    archived_at: null,
    owner_user_id: null,
    intake_type: null,
    firm_id: 'demo',
    created_by: 'demo',
    created_at: '2026-02-28T14:00:00Z',
    updated_at: '2026-03-12T10:00:00Z',
    latest_stage_event_at: '2026-03-12T10:00:00Z',
    owner: null,
  },
  {
    id: 'deal-maplewood',
    title: 'Maplewood Self Storage',
    market: 'Denver, CO',
    deal_type: 'Self Storage',
    source_type: 'broker',
    source_name: 'Amanda Torres – CBRE',
    stage_id: 'stage-screening',
    is_archived: false,
    archived_at: null,
    owner_user_id: null,
    intake_type: null,
    firm_id: 'demo',
    created_by: 'demo',
    created_at: '2026-03-10T09:00:00Z',
    updated_at: '2026-03-10T09:00:00Z',
    latest_stage_event_at: '2026-03-10T09:00:00Z',
    owner: null,
  },
  {
    id: 'deal-grand-hotel',
    title: 'The Grand Hotel Nashville',
    market: 'Nashville, TN',
    deal_type: 'Hospitality',
    source_type: 'broker',
    source_name: 'Amanda Torres – CBRE',
    stage_id: 'stage-screening',
    is_archived: false,
    archived_at: null,
    owner_user_id: null,
    intake_type: null,
    firm_id: 'demo',
    created_by: 'demo',
    created_at: '2026-03-15T16:00:00Z',
    updated_at: '2026-03-15T16:00:00Z',
    latest_stage_event_at: '2026-03-15T16:00:00Z',
    owner: null,
  },
]

export const DEMO_KILL_REASONS = [
  { id: 'kr-1', name: 'Cap rate below threshold', position: 0, firm_id: 'demo', created_at: '2025-01-01T00:00:00Z' },
  { id: 'kr-2', name: 'Deferred maintenance risk', position: 1, firm_id: 'demo', created_at: '2025-01-01T00:00:00Z' },
  { id: 'kr-3', name: 'Unfavorable market dynamics', position: 2, firm_id: 'demo', created_at: '2025-01-01T00:00:00Z' },
  { id: 'kr-4', name: 'Seller pricing expectations', position: 3, firm_id: 'demo', created_at: '2025-01-01T00:00:00Z' },
]

export const DEMO_CONTACTS = [
  { id: 'contact-1', name: 'Marcus Chen',    contact_type: 'broker', company: 'JLL',                 email: 'm.chen@jll.com',        phone: '(602) 555-0142', deal_count: 6 },
  { id: 'contact-2', name: 'Sarah Rodriguez',contact_type: 'seller', company: 'Private Investor',    email: 'sarah.r@example.com',   phone: '(512) 555-0198', deal_count: 1 },
  { id: 'contact-3', name: 'David Park',     contact_type: 'lender', company: 'Pacific Western Bank',email: 'dpark@pwb.com',         phone: '(619) 555-0177', deal_count: 2 },
  { id: 'contact-4', name: 'Amanda Torres',  contact_type: 'broker', company: 'CBRE',                email: 'a.torres@cbre.com',     phone: '(720) 555-0163', deal_count: 3 },
]

export const DEMO_DEAL_EVENTS: Record<string, {
  id: string
  event_type: string
  notes: string | null
  created_at: string
  actor: string
  from_stage: string | null
  to_stage: string | null
  kill_reason: string | null
}[]> = {
  'deal-sunset-ridge': [
    { id: 'evt-sr-1', event_type: 'deal_created',  notes: null,                       created_at: '2026-03-01T10:00:00Z', actor: 'Alex Rivera', from_stage: null,        to_stage: null,        kill_reason: null },
    { id: 'evt-sr-2', event_type: 'stage_changed', notes: null,                       created_at: '2026-03-02T09:00:00Z', actor: 'Alex Rivera', from_stage: 'New',       to_stage: 'Screening', kill_reason: null },
    { id: 'evt-sr-3', event_type: 'file_added',    notes: 'SunsetRidge_OM.pdf',       created_at: '2026-03-05T14:00:00Z', actor: 'Alex Rivera', from_stage: null,        to_stage: null,        kill_reason: null },
  ],
  'deal-harbor-view': [
    { id: 'evt-hv-1', event_type: 'deal_created',  notes: null,                       created_at: '2026-02-20T09:00:00Z', actor: 'Alex Rivera', from_stage: null,        to_stage: null,        kill_reason: null },
    { id: 'evt-hv-2', event_type: 'stage_changed', notes: null,                       created_at: '2026-02-22T11:00:00Z', actor: 'Alex Rivera', from_stage: 'New',       to_stage: 'Screening', kill_reason: null },
    { id: 'evt-hv-3', event_type: 'stage_changed', notes: null,                       created_at: '2026-03-09T14:00:00Z', actor: 'Alex Rivera', from_stage: 'Screening', to_stage: 'LOI',       kill_reason: null },
    { id: 'evt-hv-4', event_type: 'note_added',    notes: null,                       created_at: '2026-03-11T10:00:00Z', actor: 'Alex Rivera', from_stage: null,        to_stage: null,        kill_reason: null },
  ],
  'deal-riverfront': [
    { id: 'evt-rf-1', event_type: 'deal_created',  notes: null,                       created_at: '2026-03-05T08:00:00Z', actor: 'Alex Rivera', from_stage: null,        to_stage: null,        kill_reason: null },
    { id: 'evt-rf-2', event_type: 'stage_changed', notes: null,                       created_at: '2026-03-06T10:00:00Z', actor: 'Alex Rivera', from_stage: 'New',       to_stage: 'Screening', kill_reason: null },
    { id: 'evt-rf-3', event_type: 'stage_changed', notes: null,                       created_at: '2026-03-14T11:00:00Z', actor: 'Alex Rivera', from_stage: 'Screening', to_stage: 'Due Diligence', kill_reason: null },
  ],
  'deal-cascade': [
    { id: 'evt-cas-1', event_type: 'deal_created',  notes: null,                      created_at: '2026-02-28T14:00:00Z', actor: 'Alex Rivera', from_stage: null,        to_stage: null,        kill_reason: null },
    { id: 'evt-cas-2', event_type: 'stage_changed', notes: null,                      created_at: '2026-03-01T09:00:00Z', actor: 'Alex Rivera', from_stage: 'New',       to_stage: 'Screening', kill_reason: null },
    { id: 'evt-cas-3', event_type: 'stage_changed', notes: null,                      created_at: '2026-03-12T10:00:00Z', actor: 'Alex Rivera', from_stage: 'Screening', to_stage: 'Due Diligence', kill_reason: null },
  ],
  'deal-maplewood': [
    { id: 'evt-mw-1', event_type: 'deal_created',  notes: null,                       created_at: '2026-03-10T09:00:00Z', actor: 'Alex Rivera', from_stage: null,        to_stage: null,        kill_reason: null },
    { id: 'evt-mw-2', event_type: 'note_added',    notes: null,                       created_at: '2026-03-11T14:30:00Z', actor: 'Alex Rivera', from_stage: null,        to_stage: null,        kill_reason: null },
    { id: 'evt-mw-3', event_type: 'file_added',    notes: 'Maplewood_SS_OM.pdf',      created_at: '2026-03-12T10:15:00Z', actor: 'Alex Rivera', from_stage: null,        to_stage: null,        kill_reason: null },
    { id: 'evt-mw-4', event_type: 'stage_changed', notes: null,                       created_at: '2026-03-15T09:00:00Z', actor: 'Alex Rivera', from_stage: 'New',       to_stage: 'Screening', kill_reason: null },
    { id: 'evt-mw-5', event_type: 'note_added',    notes: null,                       created_at: '2026-03-18T16:00:00Z', actor: 'Alex Rivera', from_stage: null,        to_stage: null,        kill_reason: null },
  ],
  'deal-grand-hotel': [
    { id: 'evt-gh-1', event_type: 'deal_created',  notes: null,                       created_at: '2026-03-15T16:00:00Z', actor: 'Alex Rivera', from_stage: null,        to_stage: null,        kill_reason: null },
    { id: 'evt-gh-2', event_type: 'file_added',    notes: 'GrandHotelNashville_OM.pdf', created_at: '2026-03-15T16:05:00Z', actor: 'Alex Rivera', from_stage: null,      to_stage: null,        kill_reason: null },
  ],
  'deal-lakeview-commons': [
    { id: 'evt-lc-1', event_type: 'deal_created',  notes: null,                       created_at: '2026-03-17T09:00:00Z', actor: 'Alex Rivera', from_stage: null,        to_stage: null,        kill_reason: null },
  ],
  'deal-thornton-business-park': [
    { id: 'evt-tbp-1', event_type: 'deal_created', notes: null,                       created_at: '2026-03-18T11:00:00Z', actor: 'Alex Rivera', from_stage: null,        to_stage: null,        kill_reason: null },
  ],
}

export const DEMO_DEAL_SNAPSHOTS: Record<string, {
  purchase_price: number | null
  noi: number | null
  cap_rate: number | null
  debt_rate: number | null
  ltv: number | null
  projected_irr: number | null
  notes: string | null
  created_at: string
}> = {
  'deal-sunset-ridge': {
    purchase_price: 28500000,
    noi: 1425000,
    cap_rate: 5.0,
    debt_rate: 6.75,
    ltv: 65,
    projected_irr: 13.8,
    notes: 'Value-add assumptions: 12% rent-to-market bump over 3 years, 5-year hold, exit at 5.25 cap.',
    created_at: '2026-03-05T14:00:00Z',
  },
  'deal-harbor-view': {
    purchase_price: 12800000,
    noi: 768000,
    cap_rate: 6.0,
    debt_rate: 7.0,
    ltv: 60,
    projected_irr: 12.1,
    notes: 'Lease-up assumptions: vacant space absorbed at market rates over 18 months.',
    created_at: '2026-03-11T10:00:00Z',
  },
  'deal-riverfront': {
    purchase_price: 18200000,
    noi: 1092000,
    cap_rate: 6.0,
    debt_rate: 6.5,
    ltv: 65,
    projected_irr: 15.2,
    notes: 'Grocery anchor drives stability. Value-add from junior anchor lease-up.',
    created_at: '2026-03-14T11:00:00Z',
  },
  'deal-cascade': {
    purchase_price: 22400000,
    noi: 1456000,
    cap_rate: 6.5,
    debt_rate: 6.75,
    ltv: 65,
    projected_irr: 16.4,
    notes: 'Strong WALT of 4.2 years. Assumes mark-to-market on renewal at 5% above current rents.',
    created_at: '2026-03-12T10:00:00Z',
  },
  'deal-maplewood': {
    purchase_price: 8200000,
    noi: 492000,
    cap_rate: 6.0,
    debt_rate: 6.75,
    ltv: 65,
    projected_irr: 14.2,
    notes: 'Based on 3% annual rent growth and 5-year hold.',
    created_at: '2026-03-12T09:00:00Z',
  },
  'deal-grand-hotel': {
    purchase_price: 31000000,
    noi: 1550000,
    cap_rate: 5.0,
    debt_rate: 7.25,
    ltv: 55,
    projected_irr: 11.2,
    notes: 'F&B repositioning adds $200k NOI in year 2. Management contract renewal risk.',
    created_at: '2026-03-15T16:05:00Z',
  },
  'deal-lakeview-commons': {
    purchase_price: 9800000,
    noi: 539000,
    cap_rate: 5.5,
    debt_rate: 6.75,
    ltv: 65,
    projected_irr: 12.8,
    notes: 'Steady cash flow with rent upside on turnover. Conservative 2.5% annual growth.',
    created_at: '2026-03-17T09:00:00Z',
  },
  'deal-thornton-business-park': {
    purchase_price: 14200000,
    noi: 852000,
    cap_rate: 6.0,
    debt_rate: 6.75,
    ltv: 65,
    projected_irr: 13.5,
    notes: 'Strong Denver industrial market supports re-leasing at market or above on rollover.',
    created_at: '2026-03-18T11:00:00Z',
  },
}

export const DEMO_DEAL_NOTES: Record<string, { overview: string; risks: string; notes: string }> = {
  'deal-sunset-ridge': {
    overview: "224-unit garden-style apartment complex in Phoenix, AZ. Built 2005, 94% occupied. Value-add opportunity through unit renovations — current rents 12% below market.",
    risks: "- High interest rate environment squeezes returns\n- HOA deferred maintenance on pool and common areas\n- Phoenix market seeing increased supply in 2026",
    notes: "Marcus Chen at JLL sent OM on 2/28. Owner wants all-cash offer. IC meeting scheduled for next Thursday.",
  },
  'deal-harbor-view': {
    overview: "Class B office building, 45,000 SF, downtown San Diego. 78% leased with 3 anchor tenants. Opportunity to lease up vacant space at market rates.",
    risks: "- Office sector headwinds post-COVID\n- Two tenants with leases expiring in 18 months\n- Parking ratio below market standard",
    notes: "Amanda Torres at CBRE brought this deal. Seller open to seller financing on 10% of purchase price. Toured property 3/1.",
  },
  'deal-riverfront': {
    overview: "Anchored retail strip center, 62,000 SF, Austin TX. Anchor tenant is a national grocery chain with 7 years remaining on lease. Strong foot traffic location.",
    risks: "- Two junior anchor spaces vacant\n- Retail sector uncertainty\n- Cap rate compression in Austin may limit exit",
    notes: "Off-market deal sourced through Marcus Chen. Competing with two other buyers. Need IC approval by Friday.",
  },
  'deal-cascade': {
    overview: "Multi-tenant industrial park, 180,000 SF, Portland OR. 96% occupied with mix of light manufacturing and distribution tenants. Long WALT of 4.2 years.",
    risks: "- Portland market has seen some tenant exodus\n- One large tenant (22% of NRI) has early termination option in year 3\n- Roof on Building C needs replacement",
    notes: "Received OM from Marcus Chen on 3/3. Strong industrial fundamentals. Scheduling site visit next week.",
  },
  'deal-maplewood': {
    overview: "450-unit self storage facility in Denver's southeast submarket. Mix of climate-controlled and standard units across 62,000 net rentable SF. Currently 91% occupied. Stabilized asset with below-market rents — opportunity to push rates on rollover.",
    risks: "- Rent growth assumptions (3%/yr) may be aggressive given new supply pipeline in Denver metro\n- Environmental Phase I not yet ordered\n- Roof replacement estimated at $180k deferred within 2 years",
    notes: "Spoke with Amanda Torres on 3/4 — seller motivated, willing to carry 5% seller note at closing. Targeting LOI by 3/21. Need to confirm debt terms with lender before submitting.",
  },
  'deal-grand-hotel': {
    overview: "148-room boutique hotel in downtown Nashville. Strong RevPAR performance driven by Nashville tourism boom. Opportunity to reposition F&B and increase ADR.",
    risks: "- Hospitality is operationally intensive\n- New hotel supply coming to Nashville in 2026–2027\n- Management contract expires in 14 months",
    notes: "Early stage screening. Interesting story but outside our typical asset class. Flagged for IC discussion.",
  },
  'deal-lakeview-commons': {
    overview: "72-unit workforce housing complex in Chicago, IL. 97% occupied. Long-term tenants, stable cash flow. Below-market rents with upside on turnover.",
    risks: "- Chicago market regulatory environment\n- Property taxes have increased 18% over last 3 years\n- Older building — 1987 construction",
    notes: "Just received from Marcus Chen. Early look — need to review financials in detail.",
  },
  'deal-thornton-business-park': {
    overview: "Small bay industrial park, 95,000 SF, suburban Denver. 100% occupied with 8 tenants. Average lease term 2.8 years — rollover risk but strong market.",
    risks: "- Short lease terms create rollover risk\n- Suburban location limits tenant pool\n- Older construction — 1998",
    notes: "Just came in yesterday. Denver industrial is strong. Worth a closer look.",
  },
}

export const DEMO_DEAL_CONTACTS: Record<string, { contact_id: string; is_source: boolean }[]> = {
  'deal-sunset-ridge': [
    { contact_id: 'contact-1', is_source: true },
  ],
  'deal-harbor-view': [
    { contact_id: 'contact-4', is_source: true },
    { contact_id: 'contact-3', is_source: false },
  ],
  'deal-riverfront': [
    { contact_id: 'contact-1', is_source: true },
    { contact_id: 'contact-3', is_source: false },
  ],
  'deal-cascade': [
    { contact_id: 'contact-1', is_source: true },
  ],
  'deal-maplewood': [
    { contact_id: 'contact-4', is_source: true },
  ],
  'deal-grand-hotel': [
    { contact_id: 'contact-4', is_source: true },
  ],
  'deal-lakeview-commons': [
    { contact_id: 'contact-1', is_source: true },
  ],
  'deal-thornton-business-park': [
    { contact_id: 'contact-1', is_source: true },
  ],
}

export const DEMO_SCORING_CRITERIA = [
  { id: 'sc-1', name: 'Location Grade',        description: null, position: 0, is_active: true },
  { id: 'sc-2', name: 'Tenant Quality',         description: null, position: 1, is_active: true },
  { id: 'sc-3', name: 'Lease Term Remaining',   description: null, position: 2, is_active: true },
  { id: 'sc-4', name: 'Debt Coverage Ratio',    description: null, position: 3, is_active: true },
  { id: 'sc-5', name: 'Cap Rate vs Threshold',  description: null, position: 4, is_active: true },
  { id: 'sc-6', name: 'Market Demand',          description: null, position: 5, is_active: true },
  { id: 'sc-7', name: 'Physical Condition',     description: null, position: 6, is_active: true },
  { id: 'sc-8', name: 'Exit Strategy Clarity',  description: null, position: 7, is_active: true },
]

// Per-criterion scores (1–5). Overall scores are hardcoded in DEMO_DEAL_OVERALL_SCORES below.
export const DEMO_DEAL_SCORES: Record<string, Record<string, number>> = {
  'deal-sunset-ridge': {
    'sc-1': 4, 'sc-2': 4, 'sc-3': 3, 'sc-4': 3, 'sc-5': 3, 'sc-6': 4, 'sc-7': 3, 'sc-8': 4,
  },
  'deal-harbor-view': {
    'sc-1': 4, 'sc-2': 3, 'sc-3': 2, 'sc-4': 3, 'sc-5': 3, 'sc-6': 3, 'sc-7': 4, 'sc-8': 3,
  },
  'deal-riverfront': {
    'sc-1': 5, 'sc-2': 4, 'sc-3': 4, 'sc-4': 4, 'sc-5': 4, 'sc-6': 4, 'sc-7': 3, 'sc-8': 4,
  },
  'deal-cascade': {
    'sc-1': 3, 'sc-2': 4, 'sc-3': 4, 'sc-4': 4, 'sc-5': 5, 'sc-6': 3, 'sc-7': 3, 'sc-8': 4,
  },
  'deal-maplewood': {
    'sc-1': 4, 'sc-2': 3, 'sc-3': 3, 'sc-4': 4, 'sc-5': 3,
  },
  'deal-grand-hotel': {
    'sc-1': 4, 'sc-2': 3, 'sc-3': 2, 'sc-4': 2, 'sc-5': 3, 'sc-6': 4, 'sc-7': 4, 'sc-8': 3,
  },
  'deal-lakeview-commons': {
    'sc-1': 3, 'sc-2': 4, 'sc-3': 3, 'sc-4': 3, 'sc-5': 3, 'sc-6': 3, 'sc-7': 3, 'sc-8': 3,
  },
  'deal-thornton-business-park': {
    'sc-1': 3, 'sc-2': 3, 'sc-3': 2, 'sc-4': 3, 'sc-5': 4, 'sc-6': 4, 'sc-7': 3, 'sc-8': 3,
  },
}

// Display-level overall scores — hardcoded to match stated values exactly
export const DEMO_DEAL_OVERALL_SCORES: Record<string, number> = {
  'deal-sunset-ridge':         72,
  'deal-harbor-view':          59,
  'deal-riverfront':           88,
  'deal-cascade':              75,
  'deal-maplewood':            68,
  'deal-grand-hotel':          59,
  'deal-lakeview-commons':     59,
  'deal-thornton-business-park': 59,
}

// AI-generated reasoning shown in the demo scoring tab — one sentence per criterion
export const DEMO_DEAL_SCORE_NOTES: Record<string, Record<string, string>> = {
  'deal-sunset-ridge': {
    'sc-1': 'Strong Phoenix metro submarket with above-average population growth and consistent multifamily rent demand.',
    'sc-2': 'Residential tenants at 94% occupancy with no single-tenant concentration risk.',
    'sc-3': 'Short-term residential leases are standard for the asset class; rollover risk is managed by strong market absorption.',
    'sc-4': 'Debt coverage at current rents is adequate but tightens materially under bridge rate assumptions.',
    'sc-5': '5.0% going-in cap is at the low end of our threshold; value-add rent upside is the primary return driver.',
    'sc-6': 'Phoenix is a top-tier U.S. multifamily market with strong net migration and a constrained supply pipeline.',
    'sc-7': '2005 construction is structurally sound; unit interiors are dated but the deferred capex estimate is manageable.',
    'sc-8': 'Clear value-add thesis — renovate units, push rents to market, and exit at a stabilized cap.',
  },
  'deal-harbor-view': {
    'sc-1': 'Downtown San Diego CBD location with good transit access and strong demand from professional services tenants.',
    'sc-2': 'Mix of mid-size tenants across professional services; creditworthiness is adequate but formal verification is pending.',
    'sc-3': 'Two anchor tenants have leases expiring within 18 months, creating significant near-term rollover and re-leasing risk.',
    'sc-4': 'DSCR at 78% occupancy is adequate but provides limited cushion for lease-up costs and concessions.',
    'sc-5': '6.0% cap rate is at our threshold; successful lease-up execution will be required to justify the basis.',
    'sc-6': 'San Diego office fundamentals are mixed; remote work trends have softened downtown Class B absorption.',
    'sc-7': 'Well-maintained building with a recent lobby renovation and updated HVAC systems.',
    'sc-8': 'Lease-up exit is achievable but execution risk is moderate given the near-term lease expirations.',
  },
  'deal-riverfront': {
    'sc-1': 'High-traffic Austin retail node with strong consumer demographics and limited new supply in the immediate trade area.',
    'sc-2': 'National grocery anchor provides investment-grade credit with 7 years of remaining lease term.',
    'sc-3': 'Grocery anchor WALT of 7 years delivers long-term income stability and supports favorable financing terms.',
    'sc-4': 'At current NOI, DSCR is comfortably above 1.30x even under moderate stress assumptions.',
    'sc-5': '6.0% going-in cap rate meets our acquisition threshold with clear upside from junior anchor lease-up.',
    'sc-6': 'Austin retail fundamentals remain strong; grocery-anchored centers continue to outperform the broader retail sector.',
    'sc-7': 'Building is functional but aging; deferred maintenance on the parking field and facade is estimated at approximately $400k.',
    'sc-8': 'Stabilize junior anchor spaces and exit at a tighter cap — well-defined value creation path with identifiable milestones.',
  },
  'deal-cascade': {
    'sc-1': 'Established Portland industrial corridor with good freeway access; some tenant exodus in the broader market warrants caution.',
    'sc-2': 'Diversified mix of light manufacturing and distribution tenants with no single tenant above 25% of net rental income.',
    'sc-3': 'Strong WALT of 4.2 years provides meaningful cash flow visibility across the projected hold period.',
    'sc-4': '96% occupancy and a long WALT support DSCR well above 1.30x under current financing assumptions.',
    'sc-5': '6.5% cap rate exceeds our threshold; industrial premium is justified by tenant quality and weighted lease term.',
    'sc-6': 'Portland industrial demand is softer than Sunbelt peers; market rent growth has moderated in recent quarters.',
    'sc-7': 'Building C roof requires replacement; total deferred capex across the park is estimated at approximately $600k.',
    'sc-8': 'Mark-to-market on lease renewal and exit at a tighter industrial cap is a clear and achievable strategy.',
  },
  'deal-maplewood': {
    'sc-1': 'Well-located Denver southeast submarket with strong household density that supports self-storage demand.',
    'sc-2': 'Self-storage tenants are month-to-month by nature; no tenant credit risk, but high rollover exposure.',
    'sc-3': 'Month-to-month lease structure provides rate flexibility but limits income predictability over the hold period.',
    'sc-4': 'At 91% occupancy and below-market rents, DSCR is solid with meaningful upside as rates are pushed to market.',
    'sc-5': '6.0% going-in cap rate is at our acquisition threshold; returns depend on executing the rent-to-market strategy.',
  },
  'deal-grand-hotel': {
    'sc-1': 'Downtown Nashville location is excellent; tourism-driven demand has produced strong and consistent RevPAR growth.',
    'sc-2': 'Hotel guests are transient with no lease creditworthiness; operational execution and management quality are the key drivers.',
    'sc-3': 'No traditional lease structure; management contract expires in 14 months with renewal terms not yet confirmed.',
    'sc-4': 'Hotel DSCR is more volatile than other CRE asset classes; current NOI coverage is thin under stress occupancy scenarios.',
    'sc-5': '5.0% cap rate reflects the hospitality premium; targeted returns are feasible but execution-dependent.',
    'sc-6': 'Nashville tourism fundamentals are strong; ADR and RevPAR continue to grow year-over-year across the market.',
    'sc-7': 'Well-maintained boutique property with recent renovations to rooms and common areas that are competitive with nearby hotels.',
    'sc-8': 'F&B repositioning thesis is credible and adds $200k projected NOI, but introduces operational complexity and execution risk.',
  },
  'deal-lakeview-commons': {
    'sc-1': 'Established Chicago submarket, but property tax increases and the local regulatory environment are meaningful headwinds.',
    'sc-2': 'Long-term workforce housing tenants driving stable 97% occupancy; low turnover supports predictable cash flow.',
    'sc-3': 'Short-term residential leases are standard; rent growth is constrained by the workforce housing positioning.',
    'sc-4': 'At current below-market rents, DSCR is adequate but near-term debt service coverage leaves limited buffer.',
    'sc-5': '5.5% going-in cap is slightly below our standard threshold given Chicago regulatory and tax risks.',
    'sc-6': 'Chicago multifamily demand is stable but rent growth has lagged Sunbelt markets meaningfully over the past three years.',
    'sc-7': '1987 construction with aging mechanical systems; adequate reserves for capital expenditures will be essential.',
    'sc-8': 'Rent upside on turnover is the primary strategy; achievable but low-return with limited exit cap compression.',
  },
  'deal-thornton-business-park': {
    'sc-1': 'Suburban Denver industrial location is functional with interstate access but limits the depth of prospective tenant pool.',
    'sc-2': 'Eight diversified tenants mitigate concentration risk, though tenant credit profiles have not yet been formally verified.',
    'sc-3': 'Average lease term of 2.8 years creates significant near-term rollover risk across multiple tenants simultaneously.',
    'sc-4': '100% occupancy supports current DSCR, but short lease terms expose the asset to re-leasing costs and potential downtime.',
    'sc-5': '6.0% cap rate meets our acquisition threshold; the strong Denver industrial market supports the current basis.',
    'sc-6': 'Denver industrial fundamentals are among the strongest in the Mountain West; vacancy rates remain historically low.',
    'sc-7': '1998 construction; building systems are functional but aging — budget for deferred maintenance on roofing and dock equipment.',
    'sc-8': 'Re-leasing at market rents on rollover is the primary strategy; thesis is straightforward but dependent on continued market strength.',
  },
}

export const DEMO_KILLED_DEALS = [
  {
    id: 'killed-sunset-lakes',
    title: 'Sunset Lakes Apartments',
    market: 'Phoenix, AZ',
    deal_type: 'Multifamily',
    kill_reason: 'Pricing / Return Threshold Not Met',
    archived_at: '2026-02-15T10:00:00Z',
  },
  {
    id: 'killed-oakwood-plaza',
    title: 'Oakwood Plaza',
    market: 'Houston, TX',
    deal_type: 'Retail',
    kill_reason: 'Market / Location Concerns',
    archived_at: '2026-03-01T14:00:00Z',
  },
  {
    id: 'killed-meridian-tower',
    title: 'The Meridian Tower',
    market: 'Chicago, IL',
    deal_type: 'Office',
    kill_reason: 'Environmental Issues',
    archived_at: '2026-02-02T09:00:00Z',
  },
  {
    id: 'killed-parkside-retail',
    title: 'Parkside Retail Strip',
    market: 'Dallas, TX',
    deal_type: 'Retail',
    kill_reason: 'Pricing / Return Threshold Not Met',
    archived_at: '2026-03-07T11:00:00Z',
  },
  {
    id: 'killed-harbor-point',
    title: 'Harbor Point Industrial',
    market: 'Seattle, WA',
    deal_type: 'Industrial',
    kill_reason: 'Financing Fell Through',
    archived_at: '2026-03-12T15:00:00Z',
  },
  {
    id: 'killed-westview',
    title: 'Westview Multifamily',
    market: 'Atlanta, GA',
    deal_type: 'Multifamily',
    kill_reason: 'Pricing / Return Threshold Not Met',
    archived_at: '2026-01-18T08:00:00Z',
  },
]

export const DEMO_KILL_BREAKDOWN = [
  { name: 'Pricing / Return Threshold Not Met', count: 3 },
  { name: 'Market / Location Concerns',         count: 2 },
  { name: 'Environmental Issues',               count: 1 },
]

export const DEMO_TOTAL_KILLED = DEMO_KILL_BREAKDOWN.reduce((sum, r) => sum + r.count, 0)

export const DEMO_CHECKLIST_ITEMS: Record<string, { id: string; name: string; position: number }[]> = {
  'stage-screening': [
    { id: 'ci-s-1', name: 'Review offering memorandum', position: 0 },
    { id: 'ci-s-2', name: 'Run comparable sales analysis', position: 1 },
    { id: 'ci-s-3', name: 'Confirm market vacancy and rent data', position: 2 },
  ],
  'stage-loi': [
    { id: 'ci-l-1', name: 'Complete underwriting model', position: 0 },
    { id: 'ci-l-2', name: 'Schedule and complete site visit', position: 1 },
    { id: 'ci-l-3', name: 'Confirm debt terms with lender', position: 2 },
  ],
  'stage-due-diligence': [
    { id: 'ci-dd-1', name: 'Order Phase I environmental report', position: 0 },
    { id: 'ci-dd-2', name: 'Review and verify rent rolls', position: 1 },
    { id: 'ci-dd-3', name: 'Complete legal review and title search', position: 2 },
    { id: 'ci-dd-4', name: 'Finalize financing and term sheet', position: 3 },
  ],
}

export const DEMO_CHECKLIST_PROGRESS: Record<string, string[]> = {
  'deal-sunset-ridge':          ['ci-s-1'],
  'deal-harbor-view':           ['ci-l-1', 'ci-l-2'],
  'deal-riverfront':            ['ci-dd-1', 'ci-dd-2'],
  'deal-cascade':               ['ci-dd-1'],
  'deal-maplewood':             ['ci-s-1', 'ci-s-2'],
  'deal-grand-hotel':           [],
  'deal-lakeview-commons':      [],
  'deal-thornton-business-park':[],
}

export function getDemoDeal(id: string) {
  return DEMO_DEALS.find(d => d.id === id) ?? null
}

export function getDemoStage(id: string) {
  return DEMO_STAGES.find(s => s.id === id) ?? null
}

export function getDemoContact(id: string) {
  return DEMO_CONTACTS.find(c => c.id === id) ?? null
}
