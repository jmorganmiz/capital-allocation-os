-- Broker submission portal: public per-firm page where brokers submit deals
-- that land in the sourcing inbox (Property Finder) for review.

ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS broker_portal_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.sourcing_opportunities
  ADD COLUMN IF NOT EXISTS broker_name text,
  ADD COLUMN IF NOT EXISTS broker_email text,
  ADD COLUMN IF NOT EXISTS broker_company text,
  ADD COLUMN IF NOT EXISTS broker_message text;

-- Allow the new source type for portal submissions.
ALTER TABLE public.sourcing_opportunities
  DROP CONSTRAINT IF EXISTS sourcing_opportunities_source_type_check;
ALTER TABLE public.sourcing_opportunities
  ADD CONSTRAINT sourcing_opportunities_source_type_check
  CHECK (source_type IN ('listing_url', 'csv_import', 'broker_email', 'licensed_feed', 'manual', 'broker_portal'));

-- Portal submissions arrive unauthenticated; captured_by must allow the
-- service role to attribute them to the firm's earliest member, which the
-- existing NOT NULL reference already supports. No RLS change needed: the
-- portal writes through the service role and firms read through the existing
-- firm-scoped select policy.
