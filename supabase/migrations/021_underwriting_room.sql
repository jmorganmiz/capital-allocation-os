-- Durable, inspectable workstreams for the visual Underwriting Room.

CREATE TABLE IF NOT EXISTS public.underwriting_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.underwriting_runs(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  label text NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'needs_review', 'completed', 'failed', 'canceled')),
  artifact_summary text,
  artifact jsonb,
  evidence_count integer NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  confidence numeric(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, step_key),
  UNIQUE (run_id, position)
);

CREATE INDEX IF NOT EXISTS underwriting_steps_run_position_idx
  ON public.underwriting_steps(run_id, position);
CREATE INDEX IF NOT EXISTS underwriting_steps_queue_idx
  ON public.underwriting_steps(status, created_at)
  WHERE status IN ('queued', 'running');

CREATE TABLE IF NOT EXISTS public.underwriting_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.underwriting_runs(id) ON DELETE CASCADE,
  step_id uuid REFERENCES public.underwriting_steps(id) ON DELETE CASCADE,
  deal_file_id uuid REFERENCES public.deal_files(id) ON DELETE SET NULL,
  source_type text NOT NULL CHECK (
    source_type IN ('deal_record', 'deal_file', 'firm_memory', 'public_source', 'market_source', 'firm_rule')
  ),
  title text NOT NULL,
  source_url text,
  locator text,
  excerpt text,
  effective_at date,
  confidence numeric(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS underwriting_sources_run_idx
  ON public.underwriting_sources(run_id, created_at);
CREATE INDEX IF NOT EXISTS underwriting_sources_step_idx
  ON public.underwriting_sources(step_id, created_at);

DROP TRIGGER IF EXISTS underwriting_steps_set_updated_at ON public.underwriting_steps;
CREATE TRIGGER underwriting_steps_set_updated_at
  BEFORE UPDATE ON public.underwriting_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.underwriting_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.underwriting_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY underwriting_steps_select ON public.underwriting_steps
  FOR SELECT USING (firm_id = public.current_firm_id());

CREATE POLICY underwriting_sources_select ON public.underwriting_sources
  FOR SELECT USING (firm_id = public.current_firm_id());

