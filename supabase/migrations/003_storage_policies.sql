-- Private deal file bucket. Every object path must begin with the caller's firm id.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('deal-files', 'deal-files', false, 52428800)
ON CONFLICT (id) DO UPDATE
SET public = excluded.public,
    file_size_limit = excluded.file_size_limit;

CREATE POLICY deal_files_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'deal-files'
    AND (storage.foldername(name))[1] = public.current_firm_id()::text
  );

CREATE POLICY deal_files_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'deal-files'
    AND (storage.foldername(name))[1] = public.current_firm_id()::text
  );

CREATE POLICY deal_files_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'deal-files'
    AND (storage.foldername(name))[1] = public.current_firm_id()::text
  )
  WITH CHECK (
    bucket_id = 'deal-files'
    AND (storage.foldername(name))[1] = public.current_firm_id()::text
  );

CREATE POLICY deal_files_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'deal-files'
    AND (storage.foldername(name))[1] = public.current_firm_id()::text
  );

