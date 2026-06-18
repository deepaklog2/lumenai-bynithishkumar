import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Download,
  Languages,
  ListChecks,
  MessagesSquare,
  RefreshCw,
  ScrollText,
  Sparkles,
  Loader2,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  chatWithTranscript,
  generateStudyMaterial,
  translateTranscript,
} from "@/lib/lectures.functions";

export const Route = createFileRoute("/_authenticated/app/lecture/$id")({
  head: () => ({ meta: [{ title: "Lecture — Lumen" }] }),
  component: LecturePage,
});

const LANGUAGES = [
  "English", "Tamil", "Hindi", "Telugu", "Malayalam", "Kannada",
  "French", "German", "Spanish", "Chinese", "Japanese", "Korean", "Arabic", "Russian",
];

type Tab = "transcript" | "translate" | "summary" | "notes" | "keypoints" | "quiz" | "flashcards" | "chat";

function LecturePage() {
  const { id } = Route.useParams();
  const [tab, setTab] = useState<Tab>("transcript");

  const lectureQ = useQuery({
    queryKey: ["lecture", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("lectures").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "transcribing" || s === "pending" ? 2000 : false;
    },
  });

  const lec = lectureQ.data;
  const isProcessing = lec?.status === "transcribing" || lec?.status === "pending";

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-card/30 px-6 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <Link to="/app/history" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Library
            </Link>
            <h1 className="mt-1 truncate text-xl font-bold md:text-2xl">{lec?.title ?? "Loading…"}</h1>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {lec?.language ?? "—"} · {lec?.duration_seconds ? `${Math.round(lec.duration_seconds)}s` : "—"}
            </div>
          </div>
          {lec?.transcript && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(lec.transcript!);
                  toast.success("Copied");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
              <button
                onClick={() => downloadText(`${lec.title}.txt`, lec.transcript!)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>
            </div>
          )}
        </div>
      </div>

      {isProcessing ? (
        <ProcessingState status={lec.status} />
      ) : lec?.status === "error" ? (
        <div className="mx-auto max-w-2xl p-10 text-center">
          <div className="glass rounded-2xl p-8">
            <h2 className="text-lg font-semibold text-destructive">Transcription failed</h2>
            <p className="mt-2 text-sm text-muted-foreground">{lec.error}</p>
          </div>
        </div>
      ) : lec ? (
        <div className="mx-auto max-w-6xl px-6 py-6 md:px-10">
          <Tabs value={tab} onChange={setTab} />
          <div className="mt-6">
            {tab === "transcript" && <TranscriptView text={lec.transcript ?? ""} />}
            {tab === "translate" && <TranslatePane lectureId={id} />}
            {tab === "summary" && <StudyPane lectureId={id} kind="detailed_summary" label="Detailed summary" markdown />}
            {tab === "notes" && <StudyPane lectureId={id} kind="notes" label="Study notes" markdown />}
            {tab === "keypoints" && <KeyPointsPane lectureId={id} />}
            {tab === "quiz" && <QuizPane lectureId={id} />}
            {tab === "flashcards" && <FlashcardsPane lectureId={id} />}
            {tab === "chat" && <ChatPane lectureId={id} />}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProcessingState({ status }: { status: string }) {
  return (
    <div className="mx-auto max-w-xl p-10 text-center">
      <div className="glass rounded-3xl p-10">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <h2 className="mt-4 text-lg font-semibold">
          {status === "transcribing" ? "Transcribing with Deepgram Nova-3…" : "Queued…"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This usually takes 1-3 minutes for long-form audio. You can keep this tab open.
        </p>
      </div>
    </div>
  );
}

function Tabs({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  const items: Array<{ k: Tab; label: string; icon: typeof ScrollText }> = [
    { k: "transcript", label: "Transcript", icon: ScrollText },
    { k: "translate", label: "Translate", icon: Languages },
    { k: "summary", label: "Summary", icon: Sparkles },
    { k: "notes", label: "Notes", icon: ScrollText },
    { k: "keypoints", label: "Key points", icon: ListChecks },
    { k: "quiz", label: "Quiz", icon: ListChecks },
    { k: "flashcards", label: "Flashcards", icon: Sparkles },
    { k: "chat", label: "Chat", icon: MessagesSquare },
  ];
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted/40 p-1">
      {items.map((it) => {
        const active = value === it.k;
        return (
          <button
            key={it.k}
            onClick={() => onChange(it.k)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <it.icon className="h-3.5 w-3.5" /> {it.label}
          </button>
        );
      })}
    </div>
  );
}

function TranscriptView({ text }: { text: string }) {
  const [q, setQ] = useState("");
  const words = useMemo(() => text.trim().split(/\s+/).length, [text]);
  const highlighted = useMemo(() => {
    if (!q) return text;
    try {
      const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      return text.replace(re, "‹‹$1››");
    } catch {
      return text;
    }
  }, [text, q]);

  return (
    <div className="glass rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search transcript…"
          className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="text-xs text-muted-foreground">{words} words</div>
      </div>
      <div className="prose prose-invert max-w-none whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">
        {highlighted.split(/(‹‹.*?››)/).map((seg, i) =>
          seg.startsWith("‹‹") ? (
            <mark key={i} className="rounded bg-primary/30 px-0.5 text-foreground">
              {seg.slice(2, -2)}
            </mark>
          ) : (
            <span key={i}>{seg}</span>
          ),
        )}
      </div>
    </div>
  );
}

function TranslatePane({ lectureId }: { lectureId: string }) {
  const [lang, setLang] = useState("Tamil");
  const fn = useServerFn(translateTranscript);
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["translations", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("translations")
        .select("*")
        .eq("lecture_id", lectureId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const mut = useMutation({
    mutationFn: () => fn({ data: { lecture_id: lectureId, target_language: lang } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["translations", lectureId] });
      toast.success(`Translated to ${lang}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <Languages className="h-4 w-4 text-primary" />
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <button
          disabled={mut.isPending}
          onClick={() => mut.mutate()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Translate
        </button>
      </div>
      <div className="grid gap-3">
        {list.data?.map((t) => (
          <div key={t.id} className="glass rounded-2xl p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">{t.target_language}</div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(t.translated_text);
                  toast.success("Copied");
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">
              {t.translated_text}
            </div>
          </div>
        ))}
        {!list.data?.length && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No translations yet — pick a language above.
          </div>
        )}
      </div>
    </div>
  );
}

function StudyPane({
  lectureId,
  kind,
  label,
  markdown,
}: {
  lectureId: string;
  kind: "detailed_summary" | "notes" | "short_summary";
  label: string;
  markdown?: boolean;
}) {
  const fn = useServerFn(generateStudyMaterial);
  const q = useQuery({
    queryKey: ["study", lectureId, kind],
    queryFn: () => fn({ data: { lecture_id: lectureId, kind } }),
  });
  const qc = useQueryClient();
  const regen = useMutation({
    mutationFn: () => fn({ data: { lecture_id: lectureId, kind, regenerate: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study", lectureId, kind] }),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any = q.data?.content;
  const text = markdown ? content?.markdown : content?.text;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">{label}</h2>
        <button
          disabled={regen.isPending}
          onClick={() => regen.mutate()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent"
        >
          <RefreshCw className={`h-3 w-3 ${regen.isPending ? "animate-spin" : ""}`} /> Regenerate
        </button>
      </div>
      <div className="glass rounded-2xl p-6">
        {q.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : markdown ? (
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{text ?? ""}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-[15px] leading-7">{text}</p>
        )}
      </div>
    </div>
  );
}

function KeyPointsPane({ lectureId }: { lectureId: string }) {
  const fn = useServerFn(generateStudyMaterial);
  const q = useQuery({
    queryKey: ["study", lectureId, "key_points"],
    queryFn: () => fn({ data: { lecture_id: lectureId, kind: "key_points" } }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const points: string[] = (q.data?.content as any)?.points ?? [];
  return (
    <div className="glass rounded-2xl p-6">
      {q.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : (
        <ul className="space-y-3">
          {points.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="text-[15px] leading-7">{p}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuizPane({ lectureId }: { lectureId: string }) {
  const fn = useServerFn(generateStudyMaterial);
  const q = useQuery({
    queryKey: ["study", lectureId, "quiz"],
    queryFn: () => fn({ data: { lecture_id: lectureId, kind: "quiz" } }),
  });
  type Q = { question: string; options: string[]; answer_index: number; explanation: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questions: Q[] = (q.data?.content as any)?.questions ?? [];
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (q.isLoading) return <Loader2 className="h-5 w-5 animate-spin text-primary" />;

  const score = submitted
    ? questions.filter((qq, i) => answers[i] === qq.answer_index).length
    : 0;

  return (
    <div className="space-y-4">
      {questions.map((qq, i) => (
        <div key={i} className="glass rounded-2xl p-5">
          <div className="mb-3 font-semibold">
            {i + 1}. {qq.question}
          </div>
          <div className="space-y-2">
            {qq.options.map((opt, j) => {
              const picked = answers[i] === j;
              const correct = submitted && j === qq.answer_index;
              const wrong = submitted && picked && j !== qq.answer_index;
              return (
                <button
                  key={j}
                  disabled={submitted}
                  onClick={() => setAnswers({ ...answers, [i]: j })}
                  className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    correct
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : wrong
                        ? "border-destructive/40 bg-destructive/10"
                        : picked
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-accent"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {submitted && (
            <div className="mt-3 text-xs text-muted-foreground">💡 {qq.explanation}</div>
          )}
        </div>
      ))}
      {questions.length > 0 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setSubmitted(false);
              setAnswers({});
            }}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            Reset
          </button>
          {submitted ? (
            <div className="font-semibold">
              Score: <span className="gradient-text">{score} / {questions.length}</span>
            </div>
          ) : (
            <button
              onClick={() => setSubmitted(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Submit
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FlashcardsPane({ lectureId }: { lectureId: string }) {
  const fn = useServerFn(generateStudyMaterial);
  const q = useQuery({
    queryKey: ["study", lectureId, "flashcards"],
    queryFn: () => fn({ data: { lecture_id: lectureId, kind: "flashcards" } }),
  });
  type C = { front: string; back: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cards: C[] = (q.data?.content as any)?.cards ?? [];
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (q.isLoading) return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
  if (!cards.length) return <div className="text-sm text-muted-foreground">No flashcards.</div>;

  const card = cards[i];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 text-center text-xs text-muted-foreground">
        {i + 1} / {cards.length}
      </div>
      <button
        onClick={() => setFlipped(!flipped)}
        className="glass shadow-elegant flex min-h-[260px] w-full items-center justify-center rounded-3xl p-10 text-center transition hover:-translate-y-0.5"
      >
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            {flipped ? "Answer" : "Question"}
          </div>
          <div className="text-xl font-semibold">{flipped ? card.back : card.front}</div>
          <div className="mt-4 text-xs text-muted-foreground">Click to flip</div>
        </div>
      </button>
      <div className="mt-4 flex justify-between">
        <button
          disabled={i === 0}
          onClick={() => {
            setI(i - 1);
            setFlipped(false);
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <button
          disabled={i === cards.length - 1}
          onClick={() => {
            setI(i + 1);
            setFlipped(false);
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ChatPane({ lectureId }: { lectureId: string }) {
  const fn = useServerFn(chatWithTranscript);
  const qc = useQueryClient();
  const [input, setInput] = useState("");

  const msgs = useQuery({
    queryKey: ["chat", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("lecture_id", lectureId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const mut = useMutation({
    mutationFn: (message: string) => fn({ data: { lecture_id: lectureId, message } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", lectureId] });
      setInput("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    const el = document.getElementById("chat-bottom");
    el?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.data?.length]);

  return (
    <div className="glass flex h-[70vh] flex-col rounded-2xl">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {!msgs.data?.length && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Ask anything about this transcript. Try "Summarise in 3 bullets" or "Explain the concept of …"
          </div>
        )}
        {msgs.data?.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {mut.isPending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
          </div>
        )}
        <div id="chat-bottom" />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() && !mut.isPending) mut.mutate(input.trim());
        }}
        className="flex gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the lecture…"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={mut.isPending || !input.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function downloadText(name: string, text: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
