-- Add notes column to deal_financial_snapshots for analyst assumptions/context
ALTER TABLE deal_financial_snapshots
  ADD COLUMN IF NOT EXISTS notes text;
