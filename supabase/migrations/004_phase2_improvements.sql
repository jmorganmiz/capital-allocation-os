-- Add owner_user_id to deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES profiles(id);

-- Add intake_type to deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS intake_type text DEFAULT 'manual' CHECK (intake_type IN ('manual', 'upload', 'email'));

-- Update deal_events to add metadata column if missing
ALTER TABLE deal_events ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Set owner to creator for existing deals
UPDATE deals d
SET owner_user_id = (
  SELECT actor_user_id FROM deal_events
  WHERE deal_id = d.id AND event_type = 'deal_created'
  LIMIT 1
);
