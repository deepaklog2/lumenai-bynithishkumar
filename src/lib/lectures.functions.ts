import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Service-role Supabase client (server only, loaded inside handlers)
async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ---------- Types ----------
export type LectureStatus = "pending" | "transcribing" | "ready" | "error";

// ---------- Create lecture record ----------
export const createLecture = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().min(1).max(200),
        filename: z.string().min(1),
        audio_path: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = await getAdmin();
    const { data: row, error } = await sb
      .from("lectures")
      .insert({
        title: data.title,
        filename: data.filename,
        audio_path: data.audio_path,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- Transcribe (Deepgram) ----------
export const transcribeLecture = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ lecture_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await getAdmin();
    const dgKey = process.env.DEEPGRAM_API_KEY;
    if (!dgKey) throw new Error("DEEPGRAM_API_KEY missing");

    const { data: lec, error: lecErr } = await sb
      .from("lectures")
      .select("*")
      .eq("id", data.lecture_id)
      .single();
    if (lecErr || !lec) throw new Error("Lecture not found");

    await sb.from("lectures").update({ status: "transcribing", error: null }).eq("id", data.lecture_id);

    try {
      // Download audio from storage
      const { data: file, error: dlErr } = await sb.storage.from("audio").download(lec.audio_path);
      if (dlErr || !file) throw new Error("Failed to read audio file");
      const buf = await file.arrayBuffer();

      const params = new URLSearchParams({
        model: "nova-3",
        smart_format: "true",
        punctuate: "true",
        paragraphs: "true",
        diarize: "true",
        detect_language: "true",
        utterances: "true",
      });

      const dgRes = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
        method: "POST",
        headers: {
          Authorization: `Token ${dgKey}`,
          "Content-Type": file.type || "audio/*",
        },
        body: buf,
      });

      if (!dgRes.ok) {
        const t = await dgRes.text();
        // Fallback to nova-2
        const params2 = new URLSearchParams(params);
        params2.set("model", "nova-2");
        const dg2 = await fetch(`https://api.deepgram.com/v1/listen?${params2}`, {
          method: "POST",
          headers: { Authorization: `Token ${dgKey}`, "Content-Type": file.type || "audio/*" },
          body: buf,
        });
        if (!dg2.ok) {
          throw new Error(`Deepgram failed: ${dgRes.status} ${t.slice(0, 200)}`);
        }
        const json2 = await dg2.json();
        return await persistTranscript(sb, lec.id, json2);
      }

      const json = await dgRes.json();
      return await persistTranscript(sb, lec.id, json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await sb.from("lectures").update({ status: "error", error: msg }).eq("id", data.lecture_id);
      throw err;
    }
  });

async function persistTranscript(
  sb: Awaited<ReturnType<typeof getAdmin>>,
  lectureId: string,
  dg: unknown,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = dg as any;
  const channel = r?.results?.channels?.[0];
  const alt = channel?.alternatives?.[0];
  const transcript = alt?.paragraphs?.transcript ?? alt?.transcript ?? "";
  const detected = channel?.detected_language ?? r?.results?.language ?? null;
  const duration = r?.metadata?.duration ?? null;

  const { error } = await sb
    .from("lectures")
    .update({
      transcript,
      transcript_json: r?.results ?? null,
      language: detected,
      duration_seconds: duration,
      status: "ready",
      updated_at: new Date().toISOString(),
    })
    .eq("id", lectureId);
  if (error) throw new Error(error.message);
  return { ok: true, transcript };
}

// ---------- Translate (Gemini) ----------
export const translateTranscript = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ lecture_id: z.string().uuid(), target_language: z.string().min(2).max(40) }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = await getAdmin();
    // cache
    const { data: cached } = await sb
      .from("translations")
      .select("*")
      .eq("lecture_id", data.lecture_id)
      .eq("target_language", data.target_language)
      .maybeSingle();
    if (cached) return cached;

    const { data: lec, error } = await sb
      .from("lectures")
      .select("transcript")
      .eq("id", data.lecture_id)
      .single();
    if (error || !lec?.transcript) throw new Error("Transcript not ready");

    const { geminiChat } = await import("./ai-gateway.server");
    const translated = await geminiChat({
      system: `You are a professional translator. Translate the user's text into ${data.target_language}. Preserve paragraph structure and meaning. Return ONLY the translated text, no preface, no quotes.`,
      user: lec.transcript,
    });

    const { data: row, error: insErr } = await sb
      .from("translations")
      .insert({
        lecture_id: data.lecture_id,
        target_language: data.target_language,
        translated_text: translated.trim(),
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);
    return row;
  });

// ---------- Study materials (summary, notes, keypoints, quiz, flashcards) ----------
const STUDY_KINDS = ["short_summary", "detailed_summary", "key_points", "notes", "quiz", "flashcards"] as const;
type StudyKind = (typeof STUDY_KINDS)[number];

export const generateStudyMaterial = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        lecture_id: z.string().uuid(),
        kind: z.enum(STUDY_KINDS),
        regenerate: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = await getAdmin();
    if (!data.regenerate) {
      const { data: cached } = await sb
        .from("study_materials")
        .select("*")
        .eq("lecture_id", data.lecture_id)
        .eq("kind", data.kind)
        .maybeSingle();
      if (cached) return cached;
    }

    const { data: lec, error } = await sb
      .from("lectures")
      .select("title, transcript")
      .eq("id", data.lecture_id)
      .single();
    if (error || !lec?.transcript) throw new Error("Transcript not ready");

    const { geminiChat, geminiJson } = await import("./ai-gateway.server");
    const kind = data.kind as StudyKind;
    let content: unknown;

    if (kind === "short_summary") {
      const text = await geminiChat({
        system: "Write a concise 3-4 sentence executive summary of the lecture transcript. No preface.",
        user: lec.transcript,
      });
      content = { text: text.trim() };
    } else if (kind === "detailed_summary") {
      const text = await geminiChat({
        system:
          "Write a detailed multi-paragraph summary of the lecture transcript. Use clear markdown with section headings. Cover all main themes, examples, and conclusions.",
        user: lec.transcript,
      });
      content = { markdown: text.trim() };
    } else if (kind === "key_points") {
      const json = await geminiJson<{ points: string[] }>({
        system:
          'Extract the 8-15 most important key points from the lecture. Return JSON: {"points": ["...", "..."]}',
        user: lec.transcript,
      });
      content = json;
    } else if (kind === "notes") {
      const text = await geminiChat({
        system:
          "Generate well-structured study notes / revision sheet in markdown. Use headings, sub-bullets, bold for terms, and short examples. Optimised for exam prep.",
        user: lec.transcript,
      });
      content = { markdown: text.trim() };
    } else if (kind === "quiz") {
      const json = await geminiJson<{
        questions: Array<{ question: string; options: string[]; answer_index: number; explanation: string }>;
      }>({
        system:
          'Create a 10-question multiple-choice quiz from the transcript. Each question has 4 options. Return JSON: {"questions": [{"question": "...", "options": ["a","b","c","d"], "answer_index": 0, "explanation": "..."}]}',
        user: lec.transcript,
      });
      content = json;
    } else if (kind === "flashcards") {
      const json = await geminiJson<{ cards: Array<{ front: string; back: string }> }>({
        system:
          'Generate 12 study flashcards capturing the most important concepts from the transcript. Return JSON: {"cards": [{"front": "term or question", "back": "concise answer"}]}',
        user: lec.transcript,
      });
      content = json;
    }

    const { data: row, error: upErr } = await sb
      .from("study_materials")
      .upsert(
        { lecture_id: data.lecture_id, kind: data.kind, content: content as never },
        { onConflict: "lecture_id,kind" },
      )
      .select()
      .single();
    if (upErr) throw new Error(upErr.message);
    return row;
  });

// ---------- Chat ----------
export const chatWithTranscript = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ lecture_id: z.string().uuid(), message: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = await getAdmin();
    const { data: lec, error } = await sb
      .from("lectures")
      .select("transcript, title")
      .eq("id", data.lecture_id)
      .single();
    if (error || !lec?.transcript) throw new Error("Transcript not ready");

    const { data: history } = await sb
      .from("chat_messages")
      .select("role, content")
      .eq("lecture_id", data.lecture_id)
      .order("created_at", { ascending: true })
      .limit(20);

    const historyText = (history ?? [])
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const { geminiChat } = await import("./ai-gateway.server");
    const answer = await geminiChat({
      system: `You are an expert tutor answering questions strictly grounded in the provided lecture transcript. If the answer is not in the transcript, say so honestly. Be concise, clear, and educational. Use markdown when helpful.

LECTURE TITLE: ${lec.title}

TRANSCRIPT:
"""
${lec.transcript.slice(0, 30000)}
"""

PREVIOUS CONVERSATION:
${historyText}`,
      user: data.message,
    });

    await sb.from("chat_messages").insert([
      { lecture_id: data.lecture_id, role: "user", content: data.message },
      { lecture_id: data.lecture_id, role: "assistant", content: answer },
    ]);

    return { answer };
  });
