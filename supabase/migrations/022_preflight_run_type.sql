-- Separate analyst preflight approvals from full-underwrite executions.

ALTER TABLE public.underwriting_runs
  DROP CONSTRAINT IF EXISTS underwriting_runs_run_type_check;

UPDATE public.underwriting_runs
SET run_type = 'preflight'
WHERE run_type = 'full_underwrite'
  AND model_version LIKE 'underwriting-preflight-%';

ALTER TABLE public.underwriting_runs
  ADD CONSTRAINT underwriting_runs_run_type_check
  CHECK (run_type IN ('quick_pencil', 'preflight', 'full_underwrite', 'market_refresh', 'ic_memo'));

