-- Evidence-grounded decision writing with an auditable draft-to-save trail.

CREATE TABLE IF NOT EXISTS public.decision_writing_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('overview', 'risks')),
  mode text NOT NULL CHECK (mode IN ('guided', 'evidence')),
  prompt_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_text text,
  draft_text text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_run_id uuid REFERENCES public.underwriting_runs(id) ON DELETE SET NULL,
  model text,
  inserted_at timestamptz,
  inserted_by uuid REFERENCES auth.users(id),
  inserted_text text,
  saved_at timestamptz,
  saved_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS decision_writing_drafts_deal_created_idx
  ON public.decision_writing_drafts(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS decision_writing_drafts_firm_created_idx
  ON public.decision_writing_drafts(firm_id, created_at DESC);

ALTER TABLE public.decision_writing_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY decision_writing_drafts_select ON public.decision_writing_drafts
  FOR SELECT USING (firm_id = public.current_firm_id());

-- Writes intentionally go through scoped server actions. There are no client
-- INSERT, UPDATE, or DELETE policies for this audit record.
