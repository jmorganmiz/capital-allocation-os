-- Keep firm knowledge when an individual user leaves, and maintain edit timestamps.

ALTER TABLE public.firm_memories
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.firm_memories
  DROP CONSTRAINT IF EXISTS firm_memories_created_by_fkey;

ALTER TABLE public.firm_memories
  ADD CONSTRAINT firm_memories_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS firm_memories_set_updated_at ON public.firm_memories;
CREATE TRIGGER firm_memories_set_updated_at
  BEFORE UPDATE ON public.firm_memories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
