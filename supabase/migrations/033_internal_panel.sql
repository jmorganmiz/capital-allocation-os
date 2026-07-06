-- Internal operations panel: foundation schema.
-- Internal team users are separate from Dealstash customer profiles and are
-- gated by a role -> module permission lookup instead of per-page checks.

CREATE TABLE public.internal_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','engineer','finance','employee')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.role_permissions (
  role text NOT NULL,
  module text NOT NULL,
  access_level text NOT NULL CHECK (access_level IN ('none','read','write','full')),
  PRIMARY KEY (role, module)
);

INSERT INTO public.role_permissions (role, module, access_level) VALUES
  ('owner','ops','full'), ('owner','team','full'), ('owner','dev','full'),
  ('owner','secrets','full'), ('owner','marketing','full'), ('owner','ownership','full'),
  ('engineer','ops','read'), ('engineer','team','full'), ('engineer','dev','full'),
  ('engineer','secrets','none'), ('engineer','marketing','read'), ('engineer','ownership','read'),
  ('finance','ops','read'), ('finance','team','full'), ('finance','dev','none'),
  ('finance','secrets','none'), ('finance','marketing','read'), ('finance','ownership','full'),
  ('employee','ops','read'), ('employee','team','write'), ('employee','dev','none'),
  ('employee','secrets','none'), ('employee','marketing','none'), ('employee','ownership','none');

-- Helper used by every internal RLS policy: the caller's access level for a module.
CREATE OR REPLACE FUNCTION public.internal_access(p_module text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT rp.access_level
     FROM internal_users iu
     JOIN role_permissions rp ON rp.role = iu.role AND rp.module = p_module
     WHERE iu.id = auth.uid()),
    'none'
  );
$$;

GRANT EXECUTE ON FUNCTION public.internal_access(text) TO authenticated;

-- Seed the owner.
INSERT INTO public.internal_users (id, full_name, role)
SELECT id, 'Jack', 'owner' FROM auth.users WHERE email = 'jmorganmiz@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- ── Ops: Dealstash sales pipeline (accounts = prospective/current customer firms)
CREATE TABLE public.sales_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE SET NULL, -- null until they sign up
  company_name text NOT NULL,
  stage text NOT NULL DEFAULT 'prospect' CHECK (stage IN ('prospect','demo','trial','paying','churned')),
  owner_id uuid REFERENCES public.internal_users(id),
  monthly_value numeric,
  notes text,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Team
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  sales_account_id uuid REFERENCES public.sales_accounts(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES public.internal_users(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','blocked','done')),
  due_date date,
  created_by uuid REFERENCES public.internal_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.internal_users(id),
  module text NOT NULL,
  action text NOT NULL,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Dev: agent pipeline runs (FastAPI service on Railway emits these; read here)
CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_reference text, -- external pipeline's deal identifier
  agent_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued','running','success','failed')),
  latency_ms integer,
  error_detail text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Marketing
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('planned','active','paused','completed')),
  owner_id uuid REFERENCES public.internal_users(id),
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.outreach_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  company text,
  status text NOT NULL DEFAULT 'contacted' CHECK (status IN ('contacted','responded','converted','dead')),
  last_touch date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Attribution attaches to customer firms (the account level), not their CRE deals.
ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS lead_source_campaign_id uuid REFERENCES public.campaigns(id);

-- ── Ownership
CREATE TABLE public.equity_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_name text NOT NULL,
  percentage numeric,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.decision_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL,
  sales_account_id uuid REFERENCES public.sales_accounts(id) ON DELETE SET NULL,
  decided_by uuid REFERENCES public.internal_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── RLS: one pattern everywhere — join through internal_access(module).
ALTER TABLE public.internal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equity_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_log ENABLE ROW LEVEL SECURITY;

-- Internal users can see the roster and the permission matrix; only the owner edits.
CREATE POLICY internal_users_select ON public.internal_users
  FOR SELECT USING (EXISTS (SELECT 1 FROM internal_users iu WHERE iu.id = auth.uid()));
CREATE POLICY internal_users_owner_write ON public.internal_users
  FOR ALL USING (EXISTS (SELECT 1 FROM internal_users iu WHERE iu.id = auth.uid() AND iu.role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM internal_users iu WHERE iu.id = auth.uid() AND iu.role = 'owner'));
CREATE POLICY role_permissions_select ON public.role_permissions
  FOR SELECT USING (EXISTS (SELECT 1 FROM internal_users iu WHERE iu.id = auth.uid()));

CREATE POLICY sales_accounts_select ON public.sales_accounts
  FOR SELECT USING (internal_access('ops') <> 'none');
CREATE POLICY sales_accounts_write ON public.sales_accounts
  FOR ALL USING (internal_access('ops') IN ('write','full'))
  WITH CHECK (internal_access('ops') IN ('write','full'));

CREATE POLICY tasks_select ON public.tasks
  FOR SELECT USING (internal_access('team') <> 'none');
CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT WITH CHECK (internal_access('team') IN ('write','full'));
CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE USING (
    internal_access('team') = 'full'
    OR (internal_access('team') = 'write' AND (assignee_id = auth.uid() OR created_by = auth.uid()))
  );
CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE USING (internal_access('team') = 'full');

CREATE POLICY activity_log_select ON public.activity_log
  FOR SELECT USING (internal_access(module) <> 'none');
CREATE POLICY activity_log_insert ON public.activity_log
  FOR INSERT WITH CHECK (actor_id = auth.uid() AND EXISTS (SELECT 1 FROM internal_users iu WHERE iu.id = auth.uid()));

CREATE POLICY agent_runs_select ON public.agent_runs
  FOR SELECT USING (internal_access('dev') <> 'none');

CREATE POLICY campaigns_select ON public.campaigns
  FOR SELECT USING (internal_access('marketing') <> 'none');
CREATE POLICY campaigns_write ON public.campaigns
  FOR ALL USING (internal_access('marketing') IN ('write','full'))
  WITH CHECK (internal_access('marketing') IN ('write','full'));

CREATE POLICY outreach_select ON public.outreach_contacts
  FOR SELECT USING (internal_access('marketing') <> 'none');
CREATE POLICY outreach_write ON public.outreach_contacts
  FOR ALL USING (internal_access('marketing') IN ('write','full'))
  WITH CHECK (internal_access('marketing') IN ('write','full'));

CREATE POLICY equity_select ON public.equity_reference
  FOR SELECT USING (internal_access('ownership') <> 'none');
CREATE POLICY equity_write ON public.equity_reference
  FOR ALL USING (internal_access('ownership') = 'full')
  WITH CHECK (internal_access('ownership') = 'full');

CREATE POLICY decisions_select ON public.decision_log
  FOR SELECT USING (internal_access('ownership') <> 'none');
CREATE POLICY decisions_write ON public.decision_log
  FOR INSERT WITH CHECK (internal_access('ownership') IN ('write','full'));

CREATE INDEX tasks_assignee_idx ON public.tasks(assignee_id, status);
CREATE INDEX activity_log_created_idx ON public.activity_log(created_at DESC);
CREATE INDEX agent_runs_status_idx ON public.agent_runs(status, created_at DESC);
CREATE INDEX sales_accounts_stage_idx ON public.sales_accounts(stage);
