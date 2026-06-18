import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { AudioLines, Upload, History, Home } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [{ title: "Lumen — Workspace" }],
  }),
  component: AppLayout,
});

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
          <div className="mt-auto px-3 py-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Home className="h-3.5 w-3.5" /> Back to landing
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
