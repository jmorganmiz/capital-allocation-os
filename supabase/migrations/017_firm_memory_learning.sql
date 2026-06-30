-- Firm-scoped learning loop memory for the in-app AI analyst.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.firm_memories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id          uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  source_question  text,
  source_answer    text,
  content          text NOT NULL CHECK (length(content) BETWEEN 1 AND 4000),
  feedback_type    text NOT NULL DEFAULT 'saved'
                    CHECK (feedback_type IN ('saved', 'helpful', 'not_helpful', 'correction', 'firm_rule')),
  tags             text[] NOT NULL DEFAULT '{}',
  created_by       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS firm_memories_lookup_idx
  ON public.firm_memories(firm_id, created_at DESC);

CREATE INDEX IF NOT EXISTS firm_memories_feedback_idx
  ON public.firm_memories(firm_id, feedback_type, created_at DESC);

ALTER TABLE public.firm_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY firm_memories_select ON public.firm_memories
  FOR SELECT USING (firm_id = public.current_firm_id());

CREATE POLICY firm_memories_insert ON public.firm_memories
  FOR INSERT WITH CHECK (firm_id = public.current_firm_id() AND created_by = auth.uid());

CREATE POLICY firm_memories_update ON public.firm_memories
  FOR UPDATE USING (firm_id = public.current_firm_id())
  WITH CHECK (firm_id = public.current_firm_id());

CREATE POLICY firm_memories_delete ON public.firm_memories
  FOR DELETE USING (firm_id = public.current_firm_id());
