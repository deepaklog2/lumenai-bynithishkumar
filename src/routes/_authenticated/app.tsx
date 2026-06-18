import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AudioLines, Upload, History, Home, LogOut, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [{ title: "Lumen — Workspace" }],
  }),
  component: AppLayout,
});

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  const nav = [
    { to: "/app", label: "Upload", icon: Upload, exact: true },
    { to: "/app/history", label: "Library", icon: History, exact: false },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:flex">
        <Link to="/" className="flex items-center gap-2 px-6 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <AudioLines className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-semibold">Lumen</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-3">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
          <div className="mt-auto space-y-2 border-t border-border pt-3">
            {email && (
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
                <UserIcon className="h-3.5 w-3.5" />
                <span className="truncate">{email}</span>
              </div>
            )}
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Home className="h-3 w-3" /> Back to landing
            </Link>
          </div>
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
