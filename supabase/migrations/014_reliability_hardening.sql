-- Runtime reliability fixes: inbox retries, atomic AI limits, and Stripe state.

ALTER TABLE inbound_email_events
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE inbound_email_events
SET status = 'processed',
    processed_at = COALESCE(processed_at, received_at)
WHERE status IS NULL;

ALTER TABLE inbound_email_events
  ALTER COLUMN status SET DEFAULT 'processing',
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inbound_email_events_status_check'
  ) THEN
    ALTER TABLE inbound_email_events
      ADD CONSTRAINT inbound_email_events_status_check
      CHECK (status IN ('processing', 'processed', 'failed'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION claim_inbound_email_event(p_event_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
  existing_status text;
  existing_updated_at timestamptz;
BEGIN
  IF p_event_id IS NULL OR length(p_event_id) = 0 OR length(p_event_id) > 500 THEN
    RAISE EXCEPTION 'invalid event id';
  END IF;

  INSERT INTO inbound_email_events (id, status, attempts, updated_at)
  VALUES (p_event_id, 'processing', 1, now())
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count = 1 THEN
    RETURN 'claimed';
  END IF;

  SELECT status, updated_at
    INTO existing_status, existing_updated_at
  FROM inbound_email_events
  WHERE id = p_event_id
  FOR UPDATE;

  IF existing_status = 'processed' THEN
    RETURN 'processed';
  END IF;

  IF existing_status = 'processing'
     AND existing_updated_at > now() - interval '5 minutes' THEN
    RETURN 'busy';
  END IF;

  UPDATE inbound_email_events
  SET status = 'processing',
      attempts = attempts + 1,
      last_error = NULL,
      updated_at = now()
  WHERE id = p_event_id;

  RETURN 'claimed';
END;
$$;

REVOKE ALL ON FUNCTION claim_inbound_email_event(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_inbound_email_event(text) TO service_role;

ALTER TABLE deals ADD COLUMN IF NOT EXISTS inbound_intake_key text;
CREATE UNIQUE INDEX IF NOT EXISTS deals_firm_inbound_intake_key_idx
  ON deals(firm_id, inbound_intake_key)
  WHERE inbound_intake_key IS NOT NULL;

CREATE OR REPLACE FUNCTION consume_ai_rate_limit(
  p_route text,
  p_limit integer,
  p_window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  request_count integer;
BEGIN
  IF caller_id IS NULL THEN
    RETURN false;
  END IF;
  IF p_route IS NULL OR length(p_route) = 0 OR length(p_route) > 100
     OR p_limit < 1 OR p_limit > 1000
     OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid rate-limit parameters';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(caller_id::text || ':' || p_route, 0)
  );

  DELETE FROM ai_request_log
  WHERE user_id = caller_id
    AND created_at < now() - interval '1 day';

  SELECT count(*) INTO request_count
  FROM ai_request_log
  WHERE user_id = caller_id
    AND route = p_route
    AND created_at >= now() - make_interval(secs => p_window_seconds);

  IF request_count >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO ai_request_log (user_id, route)
  VALUES (caller_id, p_route);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION consume_ai_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_ai_rate_limit(text, integer, integer) TO authenticated;

ALTER TABLE firms
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text,
  ADD COLUMN IF NOT EXISTS stripe_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end boolean NOT NULL DEFAULT false;

