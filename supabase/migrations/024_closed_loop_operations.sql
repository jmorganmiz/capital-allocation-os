-- Operationalize beta enrollment and add the controlled sourcing -> actuals loop.

CREATE OR REPLACE FUNCTION public.initialize_firm_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.firm_entitlements (firm_id, plan_key, underwriting_enabled, included_seats, monthly_underwrite_allowance)
  VALUES (NEW.id, 'core', false, 3, 0)
  ON CONFLICT (firm_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS firms_initialize_entitlement ON public.firms;
CREATE TRIGGER firms_initialize_entitlement
  AFTER INSERT ON public.firms
  FOR EACH ROW EXECUTE FUNCTION public.initialize_firm_entitlement();

INSERT INTO public.firm_entitlements (firm_id, plan_key, underwriting_enabled, included_seats, monthly_underwrite_allowance)
SELECT id, 'core', false, 3, 0 FROM public.firms
ON CONFLICT (firm_id) DO NOTHING;

CREATE TABLE public.underwriting_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL UNIQUE REFERENCES public.firms(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  team_size integer NOT NULL CHECK (team_size BETWEEN 1 AND 1000),
  monthly_deal_volume integer NOT NULL CHECK (monthly_deal_volume BETWEEN 0 AND 100000),
  workflow_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sourcing_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('listing_url', 'csv_import', 'broker_email', 'licensed_feed', 'manual')),
  source_url text,
  source_key text NOT NULL,
  property_name text NOT NULL,
  address text,
  market text,
  asset_type text,
  asking_price numeric(15,2) CHECK (asking_price IS NULL OR asking_price >= 0),
  unit_count integer CHECK (unit_count IS NULL OR unit_count >= 0),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'matched', 'promoted', 'dismissed')),
  buy_box_id uuid REFERENCES public.buy_boxes(id) ON DELETE SET NULL,
  match_score integer CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100)),
  match_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  possible_duplicate_deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  promoted_deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  captured_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, source_key)
);

CREATE INDEX sourcing_opportunities_firm_status_idx
  ON public.sourcing_opportunities(firm_id, status, created_at DESC);

CREATE TABLE public.portfolio_actuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  period_date date NOT NULL,
  noi numeric(15,2),
  occupancy numeric(7,6) CHECK (occupancy IS NULL OR (occupancy >= 0 AND occupancy <= 1)),
  average_monthly_rent numeric(15,2),
  capital_expenditures numeric(15,2),
  debt_service numeric(15,2),
  source_reference text,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, period_date)
);

CREATE INDEX portfolio_actuals_deal_period_idx
  ON public.portfolio_actuals(deal_id, period_date DESC);

CREATE TRIGGER underwriting_access_requests_set_updated_at
  BEFORE UPDATE ON public.underwriting_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER sourcing_opportunities_set_updated_at
  BEFORE UPDATE ON public.sourcing_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER portfolio_actuals_set_updated_at
  BEFORE UPDATE ON public.portfolio_actuals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.underwriting_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sourcing_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_actuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY underwriting_access_requests_select ON public.underwriting_access_requests
  FOR SELECT USING (firm_id = public.current_firm_id());
CREATE POLICY sourcing_opportunities_select ON public.sourcing_opportunities
  FOR SELECT USING (firm_id = public.current_firm_id());
CREATE POLICY portfolio_actuals_select ON public.portfolio_actuals
  FOR SELECT USING (firm_id = public.current_firm_id());

REVOKE ALL ON FUNCTION public.initialize_firm_entitlement() FROM PUBLIC, anon, authenticated;
