import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, FileAudio2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/history")({
  head: () => ({ meta: [{ title: "Library — Lumen" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["lectures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id, title, filename, status, duration_seconds, language, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function remove(id: string) {
    if (!confirm("Delete this lecture and all its data?")) return;
    const { error } = await supabase.from("lectures").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      refetch();
    }
  }

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Library</h1>
            <p className="mt-1 text-muted-foreground">All your transcribed sessions.</p>
          </div>
          <Link
            to="/app"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            + New
          </Link>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : !data?.length ? (
          <div className="glass rounded-2xl p-12 text-center">
            <FileAudio2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <div className="mt-3 font-semibold">No transcripts yet</div>
            <p className="mt-1 text-sm text-muted-foreground">Upload audio to get started.</p>
            <Link
              to="/app"
              className="mt-5 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Upload audio
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {data.map((l) => (
              <div
                key={l.id}
                className="glass flex items-center justify-between gap-4 rounded-2xl p-5"
              >
                <Link
                  to="/app/lecture/$id"
                  params={{ id: l.id }}
                  className="min-w-0 flex-1"
                >
                  <div className="truncate font-semibold">{l.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDuration(l.duration_seconds)}
                    </span>
                    <span>{l.language ?? "—"}</span>
                    <span>{new Date(l.created_at).toLocaleString()}</span>
                    <StatusBadge status={l.status} />
                  </div>
                </Link>
                <button
                  onClick={() => remove(l.id)}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ready: "bg-emerald-500/15 text-emerald-400",
    transcribing: "bg-amber-500/15 text-amber-400",
    pending: "bg-muted text-muted-foreground",
    error: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${map[status] ?? ""}`}>
      {status}
    </span>
  );
}

function formatDuration(sec: number | null) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m ${s}s`;
}
