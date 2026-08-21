-- 1. Drop leftover bug-tracker function if it still exists
DROP FUNCTION IF EXISTS public.get_team_members();

-- 2. Profiles: owner-only reads
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3. bug-attachments bucket: scope to per-user folder
DROP POLICY IF EXISTS "Authenticated can upload bug attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view bug attachments" ON storage.objects;

CREATE POLICY "Users upload own bug attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bug-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users view own bug attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'bug-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. SECURITY DEFINER functions: no anon/authenticated EXECUTE where not needed
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;

-- has_role stays callable by authenticated (RLS policies evaluate it as the caller),
-- but it now only answers about the caller's own roles.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (auth.uid() IS NULL OR _user_id = auth.uid())
  )
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;