-- Firm-scoped row-level security for the baseline schema.

CREATE OR REPLACE FUNCTION public.current_firm_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT firm_id FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.current_firm_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_firm_id() TO authenticated;

ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kill_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY firms_select ON public.firms
  FOR SELECT USING (id = public.current_firm_id());

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (firm_id = public.current_firm_id());
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND firm_id = public.current_firm_id());

CREATE POLICY deal_stages_select ON public.deal_stages
  FOR SELECT USING (firm_id = public.current_firm_id());
CREATE POLICY deal_stages_insert ON public.deal_stages
  FOR INSERT WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY deal_stages_update ON public.deal_stages
  FOR UPDATE USING (firm_id = public.current_firm_id())
  WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY deal_stages_delete ON public.deal_stages
  FOR DELETE USING (firm_id = public.current_firm_id());

CREATE POLICY kill_reasons_select ON public.kill_reasons
  FOR SELECT USING (firm_id = public.current_firm_id());
CREATE POLICY kill_reasons_insert ON public.kill_reasons
  FOR INSERT WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY kill_reasons_update ON public.kill_reasons
  FOR UPDATE USING (firm_id = public.current_firm_id())
  WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY kill_reasons_delete ON public.kill_reasons
  FOR DELETE USING (firm_id = public.current_firm_id());

CREATE POLICY deals_select ON public.deals
  FOR SELECT USING (firm_id = public.current_firm_id());
CREATE POLICY deals_insert ON public.deals
  FOR INSERT WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY deals_update ON public.deals
  FOR UPDATE USING (firm_id = public.current_firm_id())
  WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY deals_delete ON public.deals
  FOR DELETE USING (firm_id = public.current_firm_id());

CREATE POLICY deal_events_select ON public.deal_events
  FOR SELECT USING (firm_id = public.current_firm_id());
CREATE POLICY deal_events_insert ON public.deal_events
  FOR INSERT WITH CHECK (firm_id = public.current_firm_id());

CREATE POLICY deal_notes_select ON public.deal_notes
  FOR SELECT USING (firm_id = public.current_firm_id());
CREATE POLICY deal_notes_insert ON public.deal_notes
  FOR INSERT WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY deal_notes_update ON public.deal_notes
  FOR UPDATE USING (firm_id = public.current_firm_id())
  WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY deal_notes_delete ON public.deal_notes
  FOR DELETE USING (firm_id = public.current_firm_id());

CREATE POLICY deal_comments_select ON public.deal_comments
  FOR SELECT USING (firm_id = public.current_firm_id());
CREATE POLICY deal_comments_insert ON public.deal_comments
  FOR INSERT WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY deal_comments_update ON public.deal_comments
  FOR UPDATE USING (firm_id = public.current_firm_id())
  WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY deal_comments_delete ON public.deal_comments
  FOR DELETE USING (firm_id = public.current_firm_id());

CREATE POLICY deal_files_select ON public.deal_files
  FOR SELECT USING (firm_id = public.current_firm_id());
CREATE POLICY deal_files_insert ON public.deal_files
  FOR INSERT WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY deal_files_delete ON public.deal_files
  FOR DELETE USING (firm_id = public.current_firm_id());

CREATE POLICY deal_snapshots_select ON public.deal_financial_snapshots
  FOR SELECT USING (firm_id = public.current_firm_id());
CREATE POLICY deal_snapshots_insert ON public.deal_financial_snapshots
  FOR INSERT WITH CHECK (firm_id = public.current_firm_id());

CREATE POLICY contacts_select ON public.contacts
  FOR SELECT USING (firm_id = public.current_firm_id());
CREATE POLICY contacts_insert ON public.contacts
  FOR INSERT WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY contacts_update ON public.contacts
  FOR UPDATE USING (firm_id = public.current_firm_id())
  WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY contacts_delete ON public.contacts
  FOR DELETE USING (firm_id = public.current_firm_id());

CREATE POLICY deal_contacts_select ON public.deal_contacts
  FOR SELECT USING (firm_id = public.current_firm_id());
CREATE POLICY deal_contacts_insert ON public.deal_contacts
  FOR INSERT WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY deal_contacts_update ON public.deal_contacts
  FOR UPDATE USING (firm_id = public.current_firm_id())
  WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY deal_contacts_delete ON public.deal_contacts
  FOR DELETE USING (firm_id = public.current_firm_id());

CREATE POLICY scoring_criteria_select ON public.scoring_criteria
  FOR SELECT USING (firm_id = public.current_firm_id());
CREATE POLICY scoring_criteria_insert ON public.scoring_criteria
  FOR INSERT WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY scoring_criteria_update ON public.scoring_criteria
  FOR UPDATE USING (firm_id = public.current_firm_id())
  WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY scoring_criteria_delete ON public.scoring_criteria
  FOR DELETE USING (firm_id = public.current_firm_id());

CREATE POLICY deal_scores_select ON public.deal_scores
  FOR SELECT USING (firm_id = public.current_firm_id());
CREATE POLICY deal_scores_insert ON public.deal_scores
  FOR INSERT WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY deal_scores_update ON public.deal_scores
  FOR UPDATE USING (firm_id = public.current_firm_id())
  WITH CHECK (firm_id = public.current_firm_id());
CREATE POLICY deal_scores_delete ON public.deal_scores
  FOR DELETE USING (firm_id = public.current_firm_id());

