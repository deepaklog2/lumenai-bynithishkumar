
-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by owner"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Profiles updatable by owner"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles insertable by owner"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- LECTURES: add user_id and scope RLS
-- =========================================================
ALTER TABLE public.lectures
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop legacy open policy
DROP POLICY IF EXISTS "Open access lectures" ON public.lectures;

-- Remove any existing rows that have no owner (orphans from no-auth phase)
DELETE FROM public.lectures WHERE user_id IS NULL;

ALTER TABLE public.lectures
  ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX idx_lectures_user_id ON public.lectures(user_id);

CREATE POLICY "Lectures: owner read"
  ON public.lectures FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Lectures: owner insert"
  ON public.lectures FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Lectures: owner update"
  ON public.lectures FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Lectures: owner delete"
  ON public.lectures FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lectures TO authenticated;

-- =========================================================
-- TRANSLATIONS, STUDY_MATERIALS, CHAT_MESSAGES: scope via lecture ownership
-- =========================================================
DROP POLICY IF EXISTS "Open access translations" ON public.translations;
DROP POLICY IF EXISTS "Open access study_materials" ON public.study_materials;
DROP POLICY IF EXISTS "Open access chat_messages" ON public.chat_messages;

CREATE OR REPLACE FUNCTION public.owns_lecture(_lecture_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lectures
    WHERE id = _lecture_id AND user_id = auth.uid()
  );
$$;

CREATE POLICY "Translations: owner all" ON public.translations
  FOR ALL TO authenticated
  USING (public.owns_lecture(lecture_id))
  WITH CHECK (public.owns_lecture(lecture_id));

CREATE POLICY "StudyMaterials: owner all" ON public.study_materials
  FOR ALL TO authenticated
  USING (public.owns_lecture(lecture_id))
  WITH CHECK (public.owns_lecture(lecture_id));

CREATE POLICY "ChatMessages: owner all" ON public.chat_messages
  FOR ALL TO authenticated
  USING (public.owns_lecture(lecture_id))
  WITH CHECK (public.owns_lecture(lecture_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.translations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_materials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;

-- =========================================================
-- STORAGE: audio bucket — user-scoped (files live under <uid>/...)
-- =========================================================
DROP POLICY IF EXISTS "Open access audio read" ON storage.objects;
DROP POLICY IF EXISTS "Open access audio write" ON storage.objects;
DROP POLICY IF EXISTS "Open access audio update" ON storage.objects;
DROP POLICY IF EXISTS "Open access audio delete" ON storage.objects;
DROP POLICY IF EXISTS "audio open all" ON storage.objects;
DROP POLICY IF EXISTS "Audio: open" ON storage.objects;

CREATE POLICY "Audio: owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Audio: owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Audio: owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Audio: owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);
