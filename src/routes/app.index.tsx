import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UploadCloud, Loader2, AudioLines } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createLecture, transcribeLecture } from "@/lib/lectures.functions";

export const Route = createFileRoute("/app/")({
  component: UploadPage,
});

const ACCEPTED = [".mp3", ".wav", ".m4a", ".aac", ".flac", ".webm", ".mp4", ".ogg"];
const MAX_BYTES = 80 * 1024 * 1024; // 80 MB

function UploadPage() {
  const navigate = useNavigate();
  const createFn = useServerFn(createLecture);
  const transcribeFn = useServerFn(transcribeLecture);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFile = useCallback(
    async (file: File) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ACCEPTED.includes(ext)) {
        toast.error(`Unsupported format. Use ${ACCEPTED.join(", ")}`);
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error("File too large (max 80MB).");
        return;
      }
      try {
        setBusy("Uploading audio…");
        setProgress(15);
        const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("audio").upload(path, file, {
          contentType: file.type || "audio/mpeg",
          upsert: false,
        });
        if (upErr) throw upErr;
        setProgress(45);

        setBusy("Creating session…");
        const title = file.name.replace(/\.[^.]+$/, "");
        const lec = await createFn({ data: { title, filename: file.name, audio_path: path } });
        setProgress(60);

        setBusy("Transcribing with Deepgram Nova-3…");
        await transcribeFn({ data: { lecture_id: lec.id } });
        setProgress(100);

        toast.success("Transcript ready");
        navigate({ to: "/app/lecture/$id", params: { id: lec.id } });
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Upload failed");
        setBusy(null);
        setProgress(0);
      }
    },
    [createFn, transcribeFn, navigate],
  );

  return (
    <div className="aurora-bg min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold md:text-4xl">New transcription</h1>
          <p className="mt-2 text-muted-foreground">
            Drop an audio file. Lumen will transcribe it and unlock translations, notes, quizzes,
            flashcards and AI chat.
          </p>
        </div>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={`glass shadow-elegant relative block cursor-pointer rounded-3xl border-2 border-dashed p-12 text-center transition ${
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
          } ${busy ? "pointer-events-none opacity-80" : ""}`}
        >
          <input
            type="file"
            accept={ACCEPTED.join(",")}
            className="sr-only"
            disabled={!!busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <UploadCloud className="h-7 w-7" />}
          </div>
          <div className="mt-4 text-lg font-semibold">
            {busy ?? "Drop audio here or click to browse"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            MP3 · WAV · M4A · AAC · FLAC · WebM · up to 80MB
          </div>
          {busy && (
            <div className="mx-auto mt-6 h-2 max-w-md overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </label>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {[
            { t: "High accuracy", d: "Diarization, smart formatting & timestamps via Nova-3." },
            { t: "Long-form ready", d: "Lectures, meetings, podcasts — multi-hour audio supported." },
            { t: "Private storage", d: "Files stored in your private Lovable Cloud bucket." },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-border bg-card/50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AudioLines className="h-4 w-4 text-primary" /> {c.t}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{c.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
