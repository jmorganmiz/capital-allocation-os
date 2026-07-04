-- Preserve analyst-reviewed OM facts that seed Quick Pencil.
-- These remain nullable so unsupported document values fail closed.

ALTER TABLE public.deal_financial_snapshots
  ADD COLUMN IF NOT EXISTS current_rent numeric(15,2),
  ADD COLUMN IF NOT EXISTS market_rent numeric(15,2),
  ADD COLUMN IF NOT EXISTS vacancy_rate numeric(8,4),
  ADD COLUMN IF NOT EXISTS property_taxes numeric(15,2),
  ADD COLUMN IF NOT EXISTS insurance numeric(15,2);

ALTER TABLE public.deal_financial_snapshots
  ADD CONSTRAINT deal_snapshot_current_rent_nonnegative CHECK (current_rent IS NULL OR current_rent >= 0),
  ADD CONSTRAINT deal_snapshot_market_rent_nonnegative CHECK (market_rent IS NULL OR market_rent >= 0),
  ADD CONSTRAINT deal_snapshot_vacancy_rate_range CHECK (vacancy_rate IS NULL OR (vacancy_rate >= 0 AND vacancy_rate <= 1)),
  ADD CONSTRAINT deal_snapshot_property_taxes_nonnegative CHECK (property_taxes IS NULL OR property_taxes >= 0),
  ADD CONSTRAINT deal_snapshot_insurance_nonnegative CHECK (insurance IS NULL OR insurance >= 0);
