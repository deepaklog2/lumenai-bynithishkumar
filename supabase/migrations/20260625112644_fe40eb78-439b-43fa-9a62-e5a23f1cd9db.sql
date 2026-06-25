
-- Restrict SECURITY DEFINER function to prevent direct execution by signed-in users
REVOKE EXECUTE ON FUNCTION public.owns_lecture(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.owns_lecture(uuid) TO service_role;

-- Remove overly permissive 'Open audio' storage policies
DROP POLICY IF EXISTS "Open audio select" ON storage.objects;
DROP POLICY IF EXISTS "Open audio insert" ON storage.objects;
DROP POLICY IF EXISTS "Open audio update" ON storage.objects;
DROP POLICY IF EXISTS "Open audio delete" ON storage.objects;
DROP POLICY IF EXISTS "Open audio SELECT" ON storage.objects;
DROP POLICY IF EXISTS "Open audio INSERT" ON storage.objects;
DROP POLICY IF EXISTS "Open audio UPDATE" ON storage.objects;
DROP POLICY IF EXISTS "Open audio DELETE" ON storage.objects;
