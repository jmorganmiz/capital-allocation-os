// Hardcoded seed data for demo mode — no Supabase queries

export const DEMO_STAGES = [
  { id: 'stage-screening',      name: 'Screening',      position: 0, is_terminal: false, firm_id: 'demo', created_at: '2025-01-01T00:00:00Z' },
  { id: 'stage-loi',            name: 'LOI',            position: 1, is_terminal: false, firm_id: 'demo', created_at: '2025-01-01T00:00:00Z' },
  { id: 'stage-due-diligence',  name: 'Due Diligence',  position: 2, is_terminal: false, firm_id: 'demo', created_at: '2025-01-01T00:00:00Z' },
  { id: 'stage-closed',         name: 'Closed',         position: 3, is_terminal: true,  firm_id: 'demo', created_at: '2025-01-01T00:00:00Z' },
]

export const DEMO_DEALS = [
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
    updated_at: '2026-03-01T10:00:00Z',
    latest_stage_event_at: '2026-03-01T10:00:00Z',
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
    created_at: '2026-02-12T09:00:00Z',
    updated_at: '2026-02-20T14:00:00Z',
    latest_stage_event_at: '2026-02-20T14:00:00Z',
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
    created_at: '2026-01-20T08:00:00Z',
    updated_at: '2026-03-05T11:00:00Z',
    latest_stage_event_at: '2026-03-05T11:00:00Z',
    owner: { full_name: 'Alex Rivera' },
  },
  {
    id: 'deal-cascade',
    title: 'Cascade Industrial Park',
    market: 'Portland, OR',
    deal_type: 'Industrial',
    source_type: 'direct',
    source_name: null,
    stage_id: 'stage-due-diligence',
    is_archived: false,
    archived_at: null,
    owner_user_id: null,
    intake_type: null,
    firm_id: 'demo',
    created_by: 'demo',
    created_at: '2026-01-08T14:00:00Z',
    updated_at: '2026-02-28T10:00:00Z',
    latest_stage_event_at: '2026-02-28T10:00:00Z',
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
    source_type: 'direct',
    source_name: null,
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
  { id: 'contact-1', name: 'Marcus Chen',    contact_type: 'broker', company: 'JLL',                 email: 'marcus@jll.com',        phone: '(602) 555-0142', deal_count: 2 },
  { id: 'contact-2', name: 'Sarah Rodriguez',contact_type: 'seller', company: 'Private Investor',    email: 'sarah.r@example.com',   phone: '(512) 555-0198', deal_count: 1 },
  { id: 'contact-3', name: 'David Park',     contact_type: 'lender', company: 'Pacific Western Bank',email: 'dpark@pwb.com',         phone: '(619) 555-0177', deal_count: 2 },
  { id: 'contact-4', name: 'Amanda Torres',  contact_type: 'broker', company: 'CBRE',                email: 'a.torres@cbre.com',     phone: '(720) 555-0163', deal_count: 2 },
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
  'deal-maplewood': [
    {
      id: 'evt-maplewood-1',
      event_type: 'deal_created',
      notes: null,
      created_at: '2026-03-10T09:00:00Z',
      actor: 'Alex Rivera',
      from_stage: null,
      to_stage: null,
      kill_reason: null,
    },
    {
      id: 'evt-maplewood-2',
      event_type: 'note_added',
      notes: null,
      created_at: '2026-03-11T14:30:00Z',
      actor: 'Alex Rivera',
      from_stage: null,
      to_stage: null,
      kill_reason: null,
    },
    {
      id: 'evt-maplewood-3',
      event_type: 'file_added',
      notes: 'Maplewood_SS_OM.pdf',
      created_at: '2026-03-12T10:15:00Z',
      actor: 'Alex Rivera',
      from_stage: null,
      to_stage: null,
      kill_reason: null,
    },
    {
      id: 'evt-maplewood-4',
      event_type: 'stage_changed',
      notes: null,
      created_at: '2026-03-15T09:00:00Z',
      actor: 'Alex Rivera',
      from_stage: 'Screening',
      to_stage: 'LOI',
      kill_reason: null,
    },
    {
      id: 'evt-maplewood-5',
      event_type: 'note_added',
      notes: null,
      created_at: '2026-03-18T16:00:00Z',
      actor: 'Alex Rivera',
      from_stage: null,
      to_stage: null,
      kill_reason: null,
    },
  ],
  'deal-harbor-view': [
    {
      id: 'evt-harbor-1',
      event_type: 'deal_created',
      notes: null,
      created_at: '2026-02-12T09:00:00Z',
      actor: 'Alex Rivera',
      from_stage: null,
      to_stage: null,
      kill_reason: null,
    },
    {
      id: 'evt-harbor-2',
      event_type: 'stage_changed',
      notes: null,
      created_at: '2026-02-20T14:00:00Z',
      actor: 'Alex Rivera',
      from_stage: 'Screening',
      to_stage: 'LOI',
      kill_reason: null,
    },
    {
      id: 'evt-harbor-3',
      event_type: 'note_added',
      notes: null,
      created_at: '2026-02-22T10:00:00Z',
      actor: 'Alex Rivera',
      from_stage: null,
      to_stage: null,
      kill_reason: null,
    },
  ],
  'deal-riverfront': [
    {
      id: 'evt-riverfront-1',
      event_type: 'deal_created',
      notes: null,
      created_at: '2026-01-20T08:00:00Z',
      actor: 'Alex Rivera',
      from_stage: null,
      to_stage: null,
      kill_reason: null,
    },
    {
      id: 'evt-riverfront-2',
      event_type: 'stage_changed',
      notes: null,
      created_at: '2026-02-05T11:00:00Z',
      actor: 'Alex Rivera',
      from_stage: 'Screening',
      to_stage: 'LOI',
      kill_reason: null,
    },
    {
      id: 'evt-riverfront-3',
      event_type: 'stage_changed',
      notes: null,
      created_at: '2026-03-05T11:00:00Z',
      actor: 'Alex Rivera',
      from_stage: 'LOI',
      to_stage: 'Due Diligence',
      kill_reason: null,
    },
    {
      id: 'evt-riverfront-4',
      event_type: 'file_added',
      notes: 'RiverfrontRC_Phase1_Draft.pdf',
      created_at: '2026-03-07T14:00:00Z',
      actor: 'Alex Rivera',
      from_stage: null,
      to_stage: null,
      kill_reason: null,
    },
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
  'deal-harbor-view': {
    purchase_price: 12000000,
    noi: 816000,
    cap_rate: 6.8,
    debt_rate: 5.75,
    ltv: 65,
    projected_irr: 14.2,
    notes: 'Assumes 3% annual rent bumps, 5-year hold, exit at 6.5 cap.',
    created_at: '2026-02-22T10:00:00Z',
  },
  'deal-riverfront': {
    purchase_price: 8500000,
    noi: 595000,
    cap_rate: 7.0,
    debt_rate: 6.1,
    ltv: 70,
    projected_irr: 16.1,
    notes: 'Anchor tenant Whole Foods with 8 years remaining on lease.',
    created_at: '2026-03-07T14:00:00Z',
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
}

export const DEMO_DEAL_NOTES: Record<string, { overview: string; risks: string; notes: string }> = {
  'deal-harbor-view': {
    overview: "Class B office building in San Diego's UTC submarket. 87% occupied with a diverse tenant base. Strong fundamentals — proximity to UCSD and biotech corridor supports demand. Seller seeking $12M, which represents a 6.8 cap on in-place NOI.",
    risks: "- Remote work headwinds for Class B office\n- Two anchor tenants (30% of NRA) on leases expiring within 18 months\n- Deferred HVAC maintenance estimated at $450k",
    notes: "Met with seller rep Amanda Torres on Feb 18. They have one other offer pending — want clean terms. Targeting LOI by end of month.",
  },
  'deal-riverfront': {
    overview: "Anchored retail center in East Austin with Whole Foods as anchor (45k SF). Total center is 112k SF. Strong foot traffic and demographics. 94% leased. Cap rate in line with submarket comps.",
    risks: "- Anchor lease expires 2034 but has 2 \u00d7 5yr options — strong likelihood of renewal\n- Three inline tenants representing 8% of GLA on month-to-month\n- Environmental Phase I pending",
    notes: "In DD — Phase I expected back March 22. Lender quote from David Park at Pacific Western is strong (6.1% rate). Title work underway.",
  },
  'deal-maplewood': {
    overview: "450-unit self storage facility in Denver's southeast submarket. Mix of climate-controlled and standard units across 62,000 net rentable SF. Currently 91% occupied. Stabilized asset with below-market rents — opportunity to push rates on rollover.",
    risks: "- Rent growth assumptions (3%/yr) may be aggressive given new supply pipeline in Denver metro\n- Environmental Phase I not yet ordered\n- Roof replacement estimated at $180k deferred within 2 years",
    notes: "Spoke with Amanda Torres on 3/4 — seller motivated, willing to carry 5% seller note at closing. Targeting LOI by 3/21. Need to confirm debt terms with lender before submitting.",
  },
}

export const DEMO_DEAL_CONTACTS: Record<string, { contact_id: string; is_source: boolean }[]> = {
  'deal-harbor-view': [
    { contact_id: 'contact-4', is_source: true },
    { contact_id: 'contact-3', is_source: false },
  ],
  'deal-riverfront': [
    { contact_id: 'contact-1', is_source: true },
    { contact_id: 'contact-3', is_source: false },
  ],
  'deal-sunset-ridge': [
    { contact_id: 'contact-1', is_source: true },
  ],
  'deal-maplewood': [
    { contact_id: 'contact-4', is_source: false },
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

export const DEMO_DEAL_SCORES: Record<string, Record<string, number>> = {
  'deal-harbor-view': {
    'sc-1': 5, 'sc-2': 4, 'sc-3': 3, 'sc-4': 4, 'sc-5': 3, 'sc-6': 4, 'sc-7': 3, 'sc-8': 5,
  },
  'deal-riverfront': {
    'sc-1': 4, 'sc-2': 5, 'sc-3': 4, 'sc-4': 4, 'sc-5': 4, 'sc-6': 5, 'sc-7': 4, 'sc-8': 4,
  },
  'deal-maplewood': {
    'sc-1': 4, 'sc-2': 3, 'sc-3': 3, 'sc-4': 4, 'sc-5': 3,
  },
}

export const DEMO_KILL_BREAKDOWN = [
  { name: 'Pricing / Return Threshold Not Met', count: 3 },
  { name: 'Market / Location Concerns',         count: 2 },
  { name: 'Environmental Issues',               count: 1 },
]

export const DEMO_TOTAL_KILLED = DEMO_KILL_BREAKDOWN.reduce((sum, r) => sum + r.count, 0)

export function getDemoDeal(id: string) {
  return DEMO_DEALS.find(d => d.id === id) ?? null
}

export function getDemoStage(id: string) {
  return DEMO_STAGES.find(s => s.id === id) ?? null
}

export function getDemoContact(id: string) {
  return DEMO_CONTACTS.find(c => c.id === id) ?? null
}
