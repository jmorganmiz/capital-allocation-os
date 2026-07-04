CREATE OR REPLACE FUNCTION public.promote_sourcing_opportunity(
  p_opportunity_id uuid,
  p_firm_id uuid,
  p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_opportunity public.sourcing_opportunities%ROWTYPE;
  v_stage_id uuid;
  v_deal_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND firm_id = p_firm_id) THEN
    RAISE EXCEPTION 'USER_NOT_IN_FIRM';
  END IF;

  SELECT * INTO v_opportunity
  FROM public.sourcing_opportunities
  WHERE id = p_opportunity_id AND firm_id = p_firm_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OPPORTUNITY_NOT_FOUND'; END IF;
  IF v_opportunity.promoted_deal_id IS NOT NULL THEN RETURN v_opportunity.promoted_deal_id; END IF;
  IF v_opportunity.status = 'dismissed' THEN RAISE EXCEPTION 'OPPORTUNITY_DISMISSED'; END IF;
  IF v_opportunity.possible_duplicate_deal_id IS NOT NULL THEN RAISE EXCEPTION 'POSSIBLE_DUPLICATE'; END IF;

  SELECT id INTO v_stage_id FROM public.deal_stages
  WHERE firm_id = p_firm_id AND is_terminal = false
  ORDER BY position LIMIT 1;

  INSERT INTO public.deals (
    firm_id, title, address, market, deal_type, asking_price, property_size,
    source_type, source_name, stage_id, created_by
  ) VALUES (
    p_firm_id, v_opportunity.property_name, v_opportunity.address, v_opportunity.market,
    v_opportunity.asset_type, v_opportunity.asking_price,
    CASE WHEN v_opportunity.unit_count IS NULL THEN NULL ELSE v_opportunity.unit_count || ' units' END,
    'Sourcing', COALESCE(v_opportunity.source_url, 'Property Finder'), v_stage_id, p_user_id
  ) RETURNING id INTO v_deal_id;

  UPDATE public.sourcing_opportunities
  SET status = 'promoted', promoted_deal_id = v_deal_id
  WHERE id = p_opportunity_id;

  INSERT INTO public.deal_events (
    firm_id, deal_id, event_type, to_stage_id, notes, actor_user_id
  ) VALUES (
    p_firm_id, v_deal_id, 'sourcing_promoted', v_stage_id,
    'Promoted from Property Finder' || CASE WHEN v_opportunity.source_url IS NULL THEN '' ELSE ' · ' || v_opportunity.source_url END,
    p_user_id
  );
  RETURN v_deal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_sourcing_opportunity(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_sourcing_opportunity(uuid, uuid, uuid) TO service_role;
