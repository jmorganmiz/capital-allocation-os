CREATE TABLE IF NOT EXISTS invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id uuid REFERENCES firms(id) NOT NULL,
  email text NOT NULL,
  invited_by uuid REFERENCES profiles(id),
  token text UNIQUE DEFAULT gen_random_uuid()::text,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm members can manage invites"
ON invites FOR ALL
USING (firm_id IN (
  SELECT firm_id FROM profiles WHERE id = auth.uid()
));
