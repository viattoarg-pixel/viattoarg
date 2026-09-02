DROP POLICY IF EXISTS "Users upload own bug attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users view own bug attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own bug attachments" ON storage.objects;

CREATE POLICY "Users can view own contact messages"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT ON public.contact_messages TO authenticated;