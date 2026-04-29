-- Redesign buy_boxes: add name field, new threshold columns,
-- drop the unique(firm_id, asset_type) constraint so firms can have
-- multiple buy boxes per asset type, and create buy_box_criteria table.

-- Drop the unique constraint that limited one box per asset type
ALTER TABLE buy_boxes DROP CONSTRAINT IF EXISTS buy_boxes_firm_id_asset_type_key;

-- Add new columns
ALTER TABLE buy_boxes
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS min_noi numeric,
  ADD COLUMN IF NOT EXISTS preferred_deal_structure text;

-- Backfill name from asset_type for any existing rows, then enforce NOT NULL
UPDATE buy_boxes SET name = asset_type WHERE name IS NULL;
ALTER TABLE buy_boxes ALTER COLUMN name SET NOT NULL;

-- ── buy_box_criteria ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buy_box_criteria (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  buy_box_id  uuid        NOT NULL REFERENCES buy_boxes(id) ON DELETE CASCADE,
  firm_id     uuid        NOT NULL REFERENCES firms(id)     ON DELETE CASCADE,
  name        text        NOT NULL,
  description text,
  position    integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS buy_box_criteria_buy_box_id_idx ON buy_box_criteria(buy_box_id);
CREATE INDEX IF NOT EXISTS buy_box_criteria_firm_id_idx    ON buy_box_criteria(firm_id);

ALTER TABLE buy_box_criteria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buy_box_criteria_select" ON buy_box_criteria;
CREATE POLICY "buy_box_criteria_select" ON buy_box_criteria
  FOR SELECT USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "buy_box_criteria_insert" ON buy_box_criteria;
CREATE POLICY "buy_box_criteria_insert" ON buy_box_criteria
  FOR INSERT WITH CHECK (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "buy_box_criteria_update" ON buy_box_criteria;
CREATE POLICY "buy_box_criteria_update" ON buy_box_criteria
  FOR UPDATE USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "buy_box_criteria_delete" ON buy_box_criteria;
CREATE POLICY "buy_box_criteria_delete" ON buy_box_criteria
  FOR DELETE USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));
