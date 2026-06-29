-- Correct the original inbox domain and update both existing and future firms.
UPDATE firms
SET inbox_email = inbox_slug || '@getdealstash.com'
WHERE inbox_slug IS NOT NULL
  AND inbox_email IS DISTINCT FROM inbox_slug || '@getdealstash.com';

CREATE OR REPLACE FUNCTION firms_assign_inbox_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate text;
  n integer := 2;
BEGIN
  IF NEW.inbox_slug IS NOT NULL THEN
    IF NEW.inbox_email IS NULL THEN
      NEW.inbox_email := NEW.inbox_slug || '@getdealstash.com';
    END IF;
    RETURN NEW;
  END IF;

  base_slug := lower(NEW.name);
  base_slug := regexp_replace(base_slug, '[^a-z0-9 ]', '', 'g');
  base_slug := regexp_replace(base_slug, ' +', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'firm'; END IF;

  candidate := base_slug;
  WHILE EXISTS (SELECT 1 FROM firms WHERE inbox_slug = candidate) LOOP
    candidate := base_slug || '-' || n;
    n := n + 1;
  END LOOP;

  NEW.inbox_slug := candidate;
  NEW.inbox_email := candidate || '@getdealstash.com';
  RETURN NEW;
END;
$$;
