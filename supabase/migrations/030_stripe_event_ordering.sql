-- Guard against out-of-order Stripe subscription webhook delivery.
-- Stores the Stripe event `created` timestamp (unix seconds) of the last
-- subscription lifecycle event applied to the firm, so a delayed retry of an
-- older event cannot overwrite newer billing state.
ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS stripe_last_subscription_event_at bigint;
