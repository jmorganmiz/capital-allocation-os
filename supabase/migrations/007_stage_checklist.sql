-- Stage checklist items: tasks that should be completed per stage
create table if not exists stage_checklist_items (
  id         uuid        primary key default gen_random_uuid(),
  firm_id    uuid        not null references firms(id) on delete cascade,
  stage_id   uuid        not null references deal_stages(id) on delete cascade,
  name       text        not null,
  position   integer     not null default 0,
  created_at timestamptz not null default now()
);

create index on stage_checklist_items(stage_id);
create index on stage_checklist_items(firm_id);

alter table stage_checklist_items enable row level security;

create policy "checklist_items_select" on stage_checklist_items
  for select using (firm_id = (select firm_id from profiles where id = auth.uid()));
create policy "checklist_items_insert" on stage_checklist_items
  for insert with check (firm_id = (select firm_id from profiles where id = auth.uid()));
create policy "checklist_items_update" on stage_checklist_items
  for update using (firm_id = (select firm_id from profiles where id = auth.uid()));
create policy "checklist_items_delete" on stage_checklist_items
  for delete using (firm_id = (select firm_id from profiles where id = auth.uid()));


-- Per-deal completion tracking: one row when an item is checked off
create table if not exists deal_checklist_progress (
  id                 uuid        primary key default gen_random_uuid(),
  deal_id            uuid        not null references deals(id) on delete cascade,
  checklist_item_id  uuid        not null references stage_checklist_items(id) on delete cascade,
  firm_id            uuid        not null references firms(id) on delete cascade,
  completed_by       uuid        not null references profiles(id),
  completed_at       timestamptz not null default now(),
  unique(deal_id, checklist_item_id)
);

create index on deal_checklist_progress(deal_id);
create index on deal_checklist_progress(checklist_item_id);

alter table deal_checklist_progress enable row level security;

create policy "checklist_progress_select" on deal_checklist_progress
  for select using (firm_id = (select firm_id from profiles where id = auth.uid()));
create policy "checklist_progress_insert" on deal_checklist_progress
  for insert with check (firm_id = (select firm_id from profiles where id = auth.uid()));
create policy "checklist_progress_delete" on deal_checklist_progress
  for delete using (firm_id = (select firm_id from profiles where id = auth.uid()));
