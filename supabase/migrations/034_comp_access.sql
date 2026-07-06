-- Complimentary access: founder-granted bypass of the trial/subscription
-- paywall, toggled from the internal panel. Stripe webhooks never touch it.
ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS comp_access boolean NOT NULL DEFAULT false;
