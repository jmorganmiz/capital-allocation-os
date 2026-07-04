CREATE OR REPLACE FUNCTION public.approve_underwriting_access_request(
  p_request_id uuid,
  p_reviewer_id uuid,
  p_allowance integer DEFAULT 25,
  p_included_seats integer DEFAULT 5
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request public.underwriting_access_requests%ROWTYPE;
  v_period_start timestamptz := date_trunc('month', now());
BEGIN
  IF p_allowance < 1 OR p_allowance > 100000 OR p_included_seats < 1 OR p_included_seats > 1000 THEN
    RAISE EXCEPTION 'INVALID_ENTITLEMENT';
  END IF;
  SELECT * INTO v_request FROM public.underwriting_access_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_NOT_FOUND'; END IF;

  INSERT INTO public.firm_entitlements (
    firm_id, plan_key, underwriting_enabled, included_seats, monthly_underwrite_allowance,
    current_period_start, current_period_end
  ) VALUES (
    v_request.firm_id, 'underwriting_beta', true, p_included_seats, p_allowance,
    v_period_start, v_period_start + interval '1 month'
  ) ON CONFLICT (firm_id) DO UPDATE SET
    plan_key = 'underwriting_beta', underwriting_enabled = true,
    included_seats = EXCLUDED.included_seats,
    monthly_underwrite_allowance = EXCLUDED.monthly_underwrite_allowance,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end;

  UPDATE public.underwriting_access_requests
  SET status = 'approved', reviewed_by = p_reviewer_id, reviewed_at = now()
  WHERE id = p_request_id;
  RETURN v_request.firm_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_underwriting_access_request(uuid, uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_underwriting_access_request(uuid, uuid, integer, integer) TO service_role;
