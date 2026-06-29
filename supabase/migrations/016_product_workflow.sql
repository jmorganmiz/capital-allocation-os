-- Product workflow: trial lifecycle and tenant-visible inbound processing status.

ALTER TABLE firms
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

UPDATE firms
SET trial_ends_at = COALESCE(
  trial_ends_at,
  GREATEST(created_at + interval '30 days', now() + interval '7 days')
)
WHERE trial_ends_at IS NULL;

ALTER TABLE firms
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '30 days');

ALTER TABLE inbound_email_events
  ADD COLUMN IF NOT EXISTS firm_id uuid REFERENCES firms(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS inbound_email_events_firm_created_idx
  ON inbound_email_events(firm_id, received_at DESC);

DROP POLICY IF EXISTS "Firm members can view inbound email status" ON inbound_email_events;
CREATE POLICY "Firm members can view inbound email status"
  ON inbound_email_events FOR SELECT
  USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));
