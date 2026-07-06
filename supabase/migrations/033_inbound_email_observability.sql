-- Firm-visible intake diagnostics. Message bodies and attachment contents are
-- deliberately not retained in this ledger.
ALTER TABLE inbound_email_events
  ADD COLUMN IF NOT EXISTS sender text,
  ADD COLUMN IF NOT EXISTS recipient text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS attachment_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deal_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS inbound_email_events_firm_status_received_idx
  ON inbound_email_events(firm_id, status, received_at DESC);
