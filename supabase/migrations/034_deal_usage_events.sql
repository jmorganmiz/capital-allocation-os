-- Product usage pulse: track deal creation as a first-class activation signal.
-- The app writes these records through service-role code paths only; customers
-- can read their own firm's usage history via the existing RLS select policy.

ALTER TABLE public.usage_events
  DROP CONSTRAINT IF EXISTS usage_events_event_type_check;

ALTER TABLE public.usage_events
  ADD CONSTRAINT usage_events_event_type_check
  CHECK (
    event_type IN (
      'deal_created',
      'quick_pencil',
      'full_underwrite',
      'market_refresh',
      'ic_memo',
      'agent_step',
      'credit_adjustment'
    )
  );

CREATE INDEX IF NOT EXISTS usage_events_firm_event_created_idx
  ON public.usage_events(firm_id, event_type, created_at DESC);
