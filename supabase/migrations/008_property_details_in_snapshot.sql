-- Add structured property detail columns to deal_financial_snapshots
-- Previously these were saved as a prose string in deal_notes (overview section).
-- Structured columns allow autoScoreDeal and other features to read them directly.

ALTER TABLE deal_financial_snapshots
  ADD COLUMN IF NOT EXISTS square_footage integer,
  ADD COLUMN IF NOT EXISTS year_built integer,
  ADD COLUMN IF NOT EXISTS num_units integer,
  ADD COLUMN IF NOT EXISTS occupancy_rate numeric;
