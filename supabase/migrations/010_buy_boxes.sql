-- Buy boxes: per-firm, per-asset-type investment criteria thresholds
-- asset_type matches deals.deal_type values: Multifamily, Retail, Office, etc.

create table if not exists buy_boxes (
  id                uuid        primary key default gen_random_uuid(),
  firm_id           uuid        not null references firms(id) on delete cascade,
  asset_type        text        not null,
  -- Numeric thresholds stored as decimals (0.065 = 6.5%) except dscr and price
  min_cap_rate      numeric,
  max_ltv           numeric,
  min_dscr          numeric,
  min_occupancy     numeric,
  min_irr           numeric,
  max_asking_price  numeric,
  -- Free-form fields
  preferred_markets text,
  notes             text,
  updated_at        timestamptz not null default now(),
  unique(firm_id, asset_type)
);

create index on buy_boxes(firm_id);

alter table buy_boxes enable row level security;

create policy "buy_boxes_select" on buy_boxes
  for select using (firm_id = (select firm_id from profiles where id = auth.uid()));
create policy "buy_boxes_insert" on buy_boxes
  for insert with check (firm_id = (select firm_id from profiles where id = auth.uid()));
create policy "buy_boxes_update" on buy_boxes
  for update using (firm_id = (select firm_id from profiles where id = auth.uid()));
create policy "buy_boxes_delete" on buy_boxes
  for delete using (firm_id = (select firm_id from profiles where id = auth.uid()));
