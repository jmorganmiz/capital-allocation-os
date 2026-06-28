-- Reconstructed baseline from the original schema backup and the linked project.
CREATE EXTENSION IF NOT EXISTS uuid-ossp;

CREATE TABLE public.firms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  full_name text,
  email text,
  role text DEFAULT 'analyst',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_firm_id ON public.profiles(firm_id);

CREATE TABLE public.deal_stages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  is_terminal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deal_stages_firm_id ON public.deal_stages(firm_id);

CREATE TABLE public.kill_reasons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_kill_reasons_firm_id ON public.kill_reasons(firm_id);

CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  title text NOT NULL,
  market text,
  deal_type text,
  source_type text,
  source_name text,
  asking_price numeric(15,2),
  property_size text,
  address text,
  deal_structure text,
  financing_type text,
  stage_id uuid REFERENCES public.deal_stages(id),
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deals_firm_id ON public.deals(firm_id);
CREATE INDEX idx_deals_stage_id ON public.deals(stage_id);
CREATE INDEX idx_deals_is_archived ON public.deals(is_archived);
CREATE INDEX idx_deals_created_by ON public.deals(created_by);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER deals_set_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.deal_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_stage_id uuid REFERENCES public.deal_stages(id),
  to_stage_id uuid REFERENCES public.deal_stages(id),
  kill_reason_id uuid REFERENCES public.kill_reasons(id),
  notes text,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deal_events_deal_id ON public.deal_events(deal_id);
CREATE INDEX idx_deal_events_firm_id ON public.deal_events(firm_id);
CREATE INDEX idx_deal_events_type ON public.deal_events(event_type);

CREATE TABLE public.deal_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  section text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_deal_notes_unique_section ON public.deal_notes(deal_id, section);
CREATE INDEX idx_deal_notes_deal_id ON public.deal_notes(deal_id);
CREATE TRIGGER deal_notes_set_updated_at
  BEFORE UPDATE ON public.deal_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.deal_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.deal_comments(id),
  body text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deal_comments_deal_id ON public.deal_comments(deal_id);

CREATE TABLE public.deal_files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  storage_bucket text NOT NULL DEFAULT 'deal-files',
  storage_path text NOT NULL,
  filename text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deal_files_deal_id ON public.deal_files(deal_id);
CREATE INDEX idx_deal_files_firm_id ON public.deal_files(firm_id);

CREATE TABLE public.deal_financial_snapshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  purchase_price numeric(15,2),
  noi numeric(15,2),
  cap_rate numeric(8,4),
  debt_rate numeric(8,4),
  ltv numeric(8,4),
  irr numeric(8,4),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deal_snapshots_deal_id ON public.deal_financial_snapshots(deal_id);

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  contact_type text,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_contacts_firm_id ON public.contacts(firm_id);

CREATE TABLE public.deal_contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  is_source boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (deal_id, contact_id)
);
CREATE INDEX idx_deal_contacts_firm_id ON public.deal_contacts(firm_id);

CREATE TABLE public.scoring_criteria (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  position integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_scoring_criteria_firm_id ON public.scoring_criteria(firm_id);

CREATE TABLE public.deal_scores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  criteria_id uuid REFERENCES public.scoring_criteria(id) ON DELETE CASCADE,
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  score integer CHECK (score BETWEEN 1 AND 5),
  notes text,
  scored_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (deal_id, criteria_id)
);
CREATE INDEX idx_deal_scores_firm_id ON public.deal_scores(firm_id);

