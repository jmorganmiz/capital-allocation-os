-- Atomically reserve a recognizable Full Underwrite allowance unit and create
-- its durable run graph. Two revisions after the initial run are included.

CREATE OR REPLACE FUNCTION public.reserve_full_underwrite_run(
  p_run_id uuid,
  p_firm_id uuid,
  p_deal_id uuid,
  p_preflight_run_id uuid,
  p_user_id uuid,
  p_idempotency_key text,
  p_model_version text,
  p_projection_start_date date,
  p_input_snapshot jsonb,
  p_steps jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing uuid;
  v_entitlement public.firm_entitlements%ROWTYPE;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_reserved numeric(12,4);
  v_revision_count integer;
  v_credit numeric(12,4);
BEGIN
  SELECT id INTO v_existing
  FROM public.underwriting_runs
  WHERE firm_id = p_firm_id AND idempotency_key = p_idempotency_key;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.deals WHERE id = p_deal_id AND firm_id = p_firm_id
  ) THEN RAISE EXCEPTION 'DEAL_NOT_FOUND'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_user_id AND firm_id = p_firm_id
  ) THEN RAISE EXCEPTION 'USER_NOT_IN_FIRM'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.underwriting_runs
    WHERE id = p_preflight_run_id AND firm_id = p_firm_id AND deal_id = p_deal_id
      AND run_type = 'preflight' AND status = 'completed' AND approved_at IS NOT NULL
  ) THEN RAISE EXCEPTION 'PREFLIGHT_NOT_APPROVED'; END IF;

  SELECT * INTO v_entitlement
  FROM public.firm_entitlements
  WHERE firm_id = p_firm_id
  FOR UPDATE;
  IF NOT FOUND OR NOT v_entitlement.underwriting_enabled THEN
    RAISE EXCEPTION 'UNDERWRITING_NOT_ENABLED';
  END IF;

  -- A concurrent retry may have committed while this request waited for the
  -- entitlement lock. Return that run instead of spending allowance twice.
  SELECT id INTO v_existing
  FROM public.underwriting_runs
  WHERE firm_id = p_firm_id AND idempotency_key = p_idempotency_key;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  IF jsonb_typeof(p_steps) <> 'array' OR jsonb_array_length(p_steps) = 0 THEN
    RAISE EXCEPTION 'INVALID_STEP_GRAPH';
  END IF;

  SELECT count(*) INTO v_revision_count
  FROM public.underwriting_runs
  WHERE firm_id = p_firm_id AND parent_run_id = p_preflight_run_id
    AND run_type = 'full_underwrite'
    AND model_version LIKE 'full-underwrite-billable-%'
    AND status NOT IN ('failed', 'canceled');
  IF v_revision_count >= 3 THEN RAISE EXCEPTION 'REVISION_LIMIT_REACHED'; END IF;
  v_credit := CASE WHEN v_revision_count = 0 THEN 1 ELSE 0 END;

  v_period_start := COALESCE(v_entitlement.current_period_start, date_trunc('month', now()));
  v_period_end := COALESCE(v_entitlement.current_period_end, v_period_start + interval '1 month');
  IF v_credit > 0 THEN
    SELECT COALESCE(sum(credits_reserved), 0) INTO v_reserved
    FROM public.underwriting_runs
    WHERE firm_id = p_firm_id AND run_type = 'full_underwrite'
      AND model_version LIKE 'full-underwrite-billable-%'
      AND created_at >= v_period_start AND created_at < v_period_end
      AND NOT (status IN ('failed', 'canceled') AND credits_settled = 0);
    IF v_reserved + v_credit > v_entitlement.monthly_underwrite_allowance THEN
      RAISE EXCEPTION 'UNDERWRITE_ALLOWANCE_EXCEEDED';
    END IF;
  END IF;

  INSERT INTO public.underwriting_runs (
    id, firm_id, deal_id, parent_run_id, run_type, scenario_key, status,
    assumption_status, model_version, projection_start_date, input_snapshot,
    warnings, credits_reserved, credits_settled, idempotency_key, created_by, started_at
  ) VALUES (
    p_run_id, p_firm_id, p_deal_id, p_preflight_run_id, 'full_underwrite', 'base', 'queued',
    'approved', p_model_version, p_projection_start_date, p_input_snapshot,
    '[]'::jsonb, v_credit, 0, p_idempotency_key, p_user_id, now()
  );

  INSERT INTO public.underwriting_steps (firm_id, run_id, step_key, label, position, status)
  SELECT p_firm_id, p_run_id, item->>'step_key', item->>'label', (item->>'position')::integer, 'queued'
  FROM jsonb_array_elements(p_steps) item;

  RETURN p_run_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_full_underwrite_run(uuid, uuid, uuid, uuid, uuid, text, text, date, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_full_underwrite_run(uuid, uuid, uuid, uuid, uuid, text, text, date, jsonb, jsonb) TO service_role;
