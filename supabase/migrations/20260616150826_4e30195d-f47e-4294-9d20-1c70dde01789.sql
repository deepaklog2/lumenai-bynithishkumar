
CREATE TABLE public.lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  audio_path TEXT NOT NULL,
  audio_url TEXT,
  duration_seconds NUMERIC,
  language TEXT,
  transcript TEXT,
  transcript_json JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lectures TO anon, authenticated;
GRANT ALL ON public.lectures TO service_role;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access lectures" ON public.lectures FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  target_language TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lecture_id, target_language)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.translations TO anon, authenticated;
GRANT ALL ON public.translations TO service_role;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access translations" ON public.translations FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lecture_id, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_materials TO anon, authenticated;
GRANT ALL ON public.study_materials TO service_role;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access study_materials" ON public.study_materials FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_translations_lecture ON public.translations(lecture_id);
CREATE INDEX idx_study_lecture ON public.study_materials(lecture_id);
CREATE INDEX idx_chat_lecture ON public.chat_messages(lecture_id, created_at);
