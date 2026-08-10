-- Allow the decision writing copilot to create auditable drafts for general notes.

ALTER TABLE public.decision_writing_drafts
  DROP CONSTRAINT IF EXISTS decision_writing_drafts_section_check;

ALTER TABLE public.decision_writing_drafts
  ADD CONSTRAINT decision_writing_drafts_section_check
  CHECK (section IN ('overview', 'risks', 'notes'));