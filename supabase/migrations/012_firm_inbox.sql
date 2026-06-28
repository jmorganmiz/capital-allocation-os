-- Add inbox fields to firms
ALTER TABLE firms
  ADD COLUMN IF NOT EXISTS inbox_slug  text,
  ADD COLUMN IF NOT EXISTS inbox_email text;

-- Generate inbox slugs and emails for existing firms.
-- Slugify: lowercase, strip non-alphanumeric, collapse spaces to hyphens.
-- Append a counter if the slug is already taken.
DO $$
DECLARE
  r         record;
  base_slug text;
  candidate text;
  n         int;
BEGIN
  FOR r IN SELECT id, name FROM firms WHERE inbox_slug IS NULL ORDER BY created_at LOOP
    base_slug := lower(r.name);
    base_slug := regexp_replace(base_slug, '[^a-z0-9 ]', '', 'g');
    base_slug := regexp_replace(base_slug, ' +', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN base_slug := 'firm'; END IF;

    candidate := base_slug;
    n := 2;
    WHILE EXISTS (SELECT 1 FROM firms WHERE inbox_slug = candidate) LOOP
      candidate := base_slug || '-' || n;
      n := n + 1;
    END LOOP;

    UPDATE firms
    SET inbox_slug  = candidate,
        inbox_email = candidate || '@inbox.dealstash.com'
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- Enforce uniqueness after backfill
ALTER TABLE firms
  ADD CONSTRAINT firms_inbox_slug_unique  UNIQUE (inbox_slug),
  ADD CONSTRAINT firms_inbox_email_unique UNIQUE (inbox_email);

-- Trigger function: automatically assign inbox_slug + inbox_email for new firms
CREATE OR REPLACE FUNCTION firms_assign_inbox_email()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  base_slug text;
  candidate text;
  n         int := 2;
BEGIN
  IF NEW.inbox_slug IS NOT NULL THEN
    RETURN NEW;
  END IF;

  base_slug := lower(NEW.name);
  base_slug := regexp_replace(base_slug, '[^a-z0-9 ]', '', 'g');
  base_slug := regexp_replace(base_slug, ' +', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'firm'; END IF;

  candidate := base_slug;
  WHILE EXISTS (SELECT 1 FROM firms WHERE inbox_slug = candidate) LOOP
    candidate := base_slug || '-' || n;
    n := n + 1;
  END LOOP;

  NEW.inbox_slug  := candidate;
  NEW.inbox_email := candidate || '@inbox.dealstash.com';
  RETURN NEW;
END;
$$;

CREATE TRIGGER firms_inbox_email_on_insert
  BEFORE INSERT ON firms
  FOR EACH ROW EXECUTE FUNCTION firms_assign_inbox_email();

-- Idempotency ledger for signed Resend inbound webhook deliveries.
-- Only the service-role webhook handler accesses this table.
CREATE TABLE IF NOT EXISTS inbound_email_events (
  id          text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inbound_email_events ENABLE ROW LEVEL SECURITY;
