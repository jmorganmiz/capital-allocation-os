-- Per-user AI request ledger used for server-side abuse controls.
CREATE TABLE IF NOT EXISTS ai_request_log (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route      text NOT NULL CHECK (length(route) BETWEEN 1 AND 64),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_request_log_lookup_idx
  ON ai_request_log(user_id, route, created_at DESC);

ALTER TABLE ai_request_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_request_log_own_select ON ai_request_log
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY ai_request_log_own_insert ON ai_request_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Existing same-firm policies remain permissive for reads. These restrictive
-- policies ensure that configuration writes also require an administrator.
CREATE OR REPLACE FUNCTION is_firm_admin(target_firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND firm_id = target_firm_id AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION is_firm_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_firm_admin(uuid) TO authenticated;

CREATE POLICY invites_admin_insert ON invites AS RESTRICTIVE
  FOR INSERT WITH CHECK (is_firm_admin(firm_id));
CREATE POLICY invites_admin_update ON invites AS RESTRICTIVE
  FOR UPDATE USING (is_firm_admin(firm_id)) WITH CHECK (is_firm_admin(firm_id));
CREATE POLICY invites_admin_delete ON invites AS RESTRICTIVE
  FOR DELETE USING (is_firm_admin(firm_id));

CREATE POLICY checklist_admin_insert ON stage_checklist_items AS RESTRICTIVE
  FOR INSERT WITH CHECK (is_firm_admin(firm_id));
CREATE POLICY checklist_admin_update ON stage_checklist_items AS RESTRICTIVE
  FOR UPDATE USING (is_firm_admin(firm_id)) WITH CHECK (is_firm_admin(firm_id));
CREATE POLICY checklist_admin_delete ON stage_checklist_items AS RESTRICTIVE
  FOR DELETE USING (is_firm_admin(firm_id));

CREATE POLICY buy_boxes_admin_insert ON buy_boxes AS RESTRICTIVE
  FOR INSERT WITH CHECK (is_firm_admin(firm_id));
CREATE POLICY buy_boxes_admin_update ON buy_boxes AS RESTRICTIVE
  FOR UPDATE USING (is_firm_admin(firm_id)) WITH CHECK (is_firm_admin(firm_id));
CREATE POLICY buy_boxes_admin_delete ON buy_boxes AS RESTRICTIVE
  FOR DELETE USING (is_firm_admin(firm_id));

CREATE POLICY buy_box_criteria_admin_insert ON buy_box_criteria AS RESTRICTIVE
  FOR INSERT WITH CHECK (is_firm_admin(firm_id));
CREATE POLICY buy_box_criteria_admin_update ON buy_box_criteria AS RESTRICTIVE
  FOR UPDATE USING (is_firm_admin(firm_id)) WITH CHECK (is_firm_admin(firm_id));
CREATE POLICY buy_box_criteria_admin_delete ON buy_box_criteria AS RESTRICTIVE
  FOR DELETE USING (is_firm_admin(firm_id));

CREATE POLICY deal_stages_admin_insert ON deal_stages AS RESTRICTIVE
  FOR INSERT WITH CHECK (is_firm_admin(firm_id));
CREATE POLICY deal_stages_admin_update ON deal_stages AS RESTRICTIVE
  FOR UPDATE USING (is_firm_admin(firm_id)) WITH CHECK (is_firm_admin(firm_id));
CREATE POLICY deal_stages_admin_delete ON deal_stages AS RESTRICTIVE
  FOR DELETE USING (is_firm_admin(firm_id));

CREATE POLICY kill_reasons_admin_insert ON kill_reasons AS RESTRICTIVE
  FOR INSERT WITH CHECK (is_firm_admin(firm_id));
CREATE POLICY kill_reasons_admin_update ON kill_reasons AS RESTRICTIVE
  FOR UPDATE USING (is_firm_admin(firm_id)) WITH CHECK (is_firm_admin(firm_id));
CREATE POLICY kill_reasons_admin_delete ON kill_reasons AS RESTRICTIVE
  FOR DELETE USING (is_firm_admin(firm_id));

CREATE POLICY scoring_criteria_admin_insert ON scoring_criteria AS RESTRICTIVE
  FOR INSERT WITH CHECK (is_firm_admin(firm_id));
CREATE POLICY scoring_criteria_admin_update ON scoring_criteria AS RESTRICTIVE
  FOR UPDATE USING (is_firm_admin(firm_id)) WITH CHECK (is_firm_admin(firm_id));
CREATE POLICY scoring_criteria_admin_delete ON scoring_criteria AS RESTRICTIVE
  FOR DELETE USING (is_firm_admin(firm_id));
