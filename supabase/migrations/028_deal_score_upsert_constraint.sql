-- Production drift repair: AI rescoring requires one durable score per
-- deal/criterion pair so corrected evidence can replace stale AI output.

CREATE UNIQUE INDEX IF NOT EXISTS deal_scores_deal_criteria_unique_idx
  ON public.deal_scores (deal_id, criteria_id);
