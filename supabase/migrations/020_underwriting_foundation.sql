-- Underwriting Pro foundation: entitlements, versioned runs, provenance,
-- approvals, and append-only customer-visible usage records.

CREATE TABLE IF NOT EXISTS public.firm_entitlements (
  firm_id uuid PRIMARY KEY REFERENCES public.firms(id) ON DELETE CASCADE,
  plan_key text NOT NULL DEFAULT 'core'
    CHECK (plan_key IN ('core', 'underwriting_beta', 'underwriting_pro', 'scale')),
  underwriting_enabled boolean NOT NULL DEFAULT false,
  included_seats integer NOT NULL DEFAULT 3 CHECK (included_seats >= 1),
  monthly_underwrite_allowance integer NOT NULL DEFAULT 0
    CHECK (monthly_underwrite_allowance >= 0),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Existing beta firms can validate the product before public billing launches.
INSERT INTO public.firm_entitlements (
  firm_id,
  plan_key,
  underwriting_enabled,
  included_seats,
  monthly_underwrite_allowance
)
SELECT id, 'underwriting_beta', true, 5, 25
FROM public.firms
ON CONFLICT (firm_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.underwriting_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  parent_run_id uuid REFERENCES public.underwriting_runs(id) ON DELETE SET NULL,
  run_type text NOT NULL CHECK (run_type IN ('quick_pencil', 'full_underwrite', 'market_refresh', 'ic_memo')),
  scenario_key text NOT NULL DEFAULT 'base'
    CHECK (scenario_key IN ('base', 'downside', 'upside', 'custom')),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'needs_review', 'completed', 'failed', 'canceled')),
  assumption_status text NOT NULL DEFAULT 'draft'
    CHECK (assumption_status IN ('draft', 'needs_review', 'approved', 'rejected')),
  model_version text NOT NULL,
  projection_start_date date NOT NULL,
  input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_snapshot jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_code text,
  error_message text,
  credits_reserved numeric(12,4) NOT NULL DEFAULT 0 CHECK (credits_reserved >= 0),
  credits_settled numeric(12,4) NOT NULL DEFAULT 0 CHECK (credits_settled >= 0),
  idempotency_key text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS underwriting_runs_firm_created_idx
  ON public.underwriting_runs(firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS underwriting_runs_deal_created_idx
  ON public.underwriting_runs(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS underwriting_runs_status_idx
  ON public.underwriting_runs(firm_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.underwriting_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.underwriting_runs(id) ON DELETE CASCADE,
  assumption_key text NOT NULL,
  label text NOT NULL,
  category text NOT NULL,
  value jsonb NOT NULL,
  unit text,
  source_type text NOT NULL CHECK (
    source_type IN (
      'om_stated',
      'rent_roll',
      't12',
      'public_record',
      'market_derived',
      'ai_assumed',
      'analyst_override',
      'firm_rule'
    )
  ),
  source_reference text,
  source_excerpt text,
  source_effective_at date,
  confidence numeric(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  approval_status text NOT NULL DEFAULT 'needs_review'
    CHECK (approval_status IN ('needs_review', 'approved', 'rejected')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, assumption_key)
);

CREATE INDEX IF NOT EXISTS underwriting_assumptions_run_idx
  ON public.underwriting_assumptions(run_id, category, assumption_key);
CREATE INDEX IF NOT EXISTS underwriting_assumptions_review_idx
  ON public.underwriting_assumptions(firm_id, approval_status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.underwriting_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.underwriting_runs(id) ON DELETE CASCADE,
  assumption_id uuid REFERENCES public.underwriting_assumptions(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected', 'changes_requested')),
  notes text,
  decided_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS underwriting_approvals_run_idx
  ON public.underwriting_approvals(run_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  underwriting_run_id uuid REFERENCES public.underwriting_runs(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (
    event_type IN (
      'quick_pencil',
      'full_underwrite',
      'market_refresh',
      'ic_memo',
      'agent_step',
      'credit_adjustment'
    )
  ),
  quantity numeric(12,4) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  billable_credits numeric(12,4) NOT NULL DEFAULT 0 CHECK (billable_credits >= 0),
  provider text,
  model text,
  input_tokens bigint CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens bigint CHECK (output_tokens IS NULL OR output_tokens >= 0),
  search_requests integer CHECK (search_requests IS NULL OR search_requests >= 0),
  estimated_cost_usd numeric(14,6)
    CHECK (estimated_cost_usd IS NULL OR estimated_cost_usd >= 0),
  idempotency_key text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS usage_events_firm_created_idx
  ON public.usage_events(firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_run_idx
  ON public.usage_events(underwriting_run_id, created_at);
CREATE INDEX IF NOT EXISTS usage_events_user_created_idx
  ON public.usage_events(user_id, created_at DESC);

DROP TRIGGER IF EXISTS firm_entitlements_set_updated_at ON public.firm_entitlements;
CREATE TRIGGER firm_entitlements_set_updated_at
  BEFORE UPDATE ON public.firm_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS underwriting_runs_set_updated_at ON public.underwriting_runs;
CREATE TRIGGER underwriting_runs_set_updated_at
  BEFORE UPDATE ON public.underwriting_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS underwriting_assumptions_set_updated_at ON public.underwriting_assumptions;
CREATE TRIGGER underwriting_assumptions_set_updated_at
  BEFORE UPDATE ON public.underwriting_assumptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.firm_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.underwriting_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.underwriting_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.underwriting_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can inspect their firm's underwriting history and usage.
-- Mutations intentionally have no client RLS policy and must pass through a
-- server action that re-verifies firm membership and uses the service role.
CREATE POLICY firm_entitlements_select ON public.firm_entitlements
  FOR SELECT USING (firm_id = public.current_firm_id());

CREATE POLICY underwriting_runs_select ON public.underwriting_runs
  FOR SELECT USING (firm_id = public.current_firm_id());

CREATE POLICY underwriting_assumptions_select ON public.underwriting_assumptions
  FOR SELECT USING (firm_id = public.current_firm_id());

CREATE POLICY underwriting_approvals_select ON public.underwriting_approvals
  FOR SELECT USING (firm_id = public.current_firm_id());

CREATE POLICY usage_events_select ON public.usage_events
  FOR SELECT USING (firm_id = public.current_firm_id());
