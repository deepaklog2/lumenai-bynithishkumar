import { createFileRoute, Link } from "@tanstack/react-router";
import { AudioLines, Languages, Sparkles, MessagesSquare, ScrollText, Brain, ArrowRight, Mic, FileAudio, Wand2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen — Turn any audio into transcripts, notes & quizzes" },
      {
        name: "description",
        content:
          "Upload a lecture, podcast or meeting. Get a precise transcript, translate to 14 languages, generate study notes, quizzes and flashcards, and chat with the audio.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen aurora-bg">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-elegant">
            <AudioLines className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-semibold">Lumen</span>
        </Link>
        <nav className="hidden gap-7 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
        </nav>
        <Link
          to="/app"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-elegant transition hover:opacity-90"
        >
          Launch app <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <section className="container mx-auto px-6 pt-16 pb-24 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Deepgram Nova-3 · Gemini 2.5 · 14 languages
        </div>
        <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
          Turn any audio into
          <br />
          <span className="gradient-text">notes you'll actually use.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Upload a lecture, podcast or meeting. Lumen transcribes with diarization,
          translates to 14 languages, and generates summaries, quizzes & flashcards —
          then lets you chat with the transcript.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-90"
          >
            Try it free <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-6 py-3 text-sm font-medium backdrop-blur transition hover:bg-background"
          >
            See features
          </a>
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="glass rounded-3xl p-2 shadow-elegant">
            <div className="grid gap-2 rounded-2xl bg-background/60 p-6 md:grid-cols-3">
              {[
                { icon: Mic, label: "Drop audio", desc: "MP3, WAV, M4A, FLAC, AAC" },
                { icon: Wand2, label: "AI processes", desc: "Transcribe · translate · summarise" },
                { icon: FileAudio, label: "Study & export", desc: "Notes, quiz, flashcards, chat" },
              ].map((s, i) => (
                <div key={i} className="rounded-xl p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-3 font-semibold">{s.label}</div>
                  <div className="text-sm text-muted-foreground">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="container mx-auto px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Everything you need, in one workspace</h2>
          <p className="mt-3 text-muted-foreground">From raw audio to exam-ready study material.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            { i: AudioLines, t: "Pro transcription", d: "Deepgram Nova-3 with diarization, smart formatting, language detection and timestamps." },
            { i: Languages, t: "14 languages", d: "Translate transcripts to Tamil, Hindi, Spanish, Japanese, Arabic and more — instantly." },
            { i: ScrollText, t: "Smart summaries", d: "Short, detailed, key points, exam-ready revision notes — all generated in seconds." },
            { i: Brain, t: "Quiz & flashcards", d: "Auto-generated MCQs with explanations and spaced-repetition flashcards." },
            { i: MessagesSquare, t: "Chat with audio", d: "Ask questions grounded in your transcript. The tutor never hallucinates beyond it." },
            { i: Sparkles, t: "History & export", d: "Every session saved. Copy text or export transcripts and notes as TXT / Markdown." },
          ].map((f, i) => (
            <div key={i} className="glass rounded-2xl p-6 transition hover:-translate-y-0.5">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.i className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="container mx-auto px-6 py-20">
        <div className="grid gap-10 rounded-3xl glass p-10 md:grid-cols-3">
          {[
            { n: "01", t: "Upload audio", d: "Drag a lecture or podcast into Lumen. We validate the file and store it securely." },
            { n: "02", t: "AI does the heavy lifting", d: "Nova-3 transcribes, Gemini 2.5 translates and reasons over the transcript." },
            { n: "03", t: "Learn faster", d: "Generate notes, quizzes and flashcards. Chat with the transcript. Export anywhere." },
          ].map((s) => (
            <div key={s.n}>
              <div className="font-display text-4xl font-bold gradient-text">{s.n}</div>
              <h3 className="mt-2 text-lg font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>


      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        {new Date().getFullYear()}
      </footer>
    </div>
  );
}
