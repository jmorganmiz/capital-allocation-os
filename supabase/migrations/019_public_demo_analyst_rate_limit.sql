-- Anonymous, privacy-preserving rate limiting for the public demo analyst.

CREATE TABLE IF NOT EXISTS public.demo_analyst_rate_limits (
  identifier_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (identifier_hash, window_start)
);

ALTER TABLE public.demo_analyst_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.demo_analyst_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_demo_analyst_rate(
  p_identifier text,
  p_limit integer DEFAULT 12,
  p_window_seconds integer DEFAULT 3600
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window timestamptz;
  v_count integer;
BEGIN
  IF p_identifier IS NULL OR length(p_identifier) < 32 OR p_limit < 1 OR p_window_seconds < 60 THEN
    RETURN false;
  END IF;

  v_window := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  PERFORM pg_advisory_xact_lock(hashtext('demo-analyst:' || p_identifier));

  INSERT INTO public.demo_analyst_rate_limits(identifier_hash, window_start, request_count)
  VALUES (p_identifier, v_window, 1)
  ON CONFLICT (identifier_hash, window_start)
  DO UPDATE SET request_count = public.demo_analyst_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  DELETE FROM public.demo_analyst_rate_limits
  WHERE window_start < now() - interval '2 days';

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_demo_analyst_rate(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_demo_analyst_rate(text, integer, integer) TO service_role;
