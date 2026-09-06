import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  History,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Radio,
  Settings,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useActiveEmergency } from "@/hooks/useLifeline";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/check-in", label: "Check-in", icon: Clock },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/history", label: "History", icon: History },
  { to: "/responder", label: "Response Center", icon: Radio },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: emergency } = useActiveEmergency();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <LifeBuoy className="size-5 text-primary" />
            Lifeline
          </Link>
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  pathname === item.to && "bg-muted font-medium text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
        {emergency && pathname !== "/emergency" && (
          <Link
            to="/emergency"
            className="block bg-danger px-4 py-2 text-center text-sm font-semibold text-danger-foreground"
          >
            <AlertTriangle className="mr-1 inline size-4" />
            EMERGENCY ACTIVE — open emergency mode
          </Link>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 pb-8">
        <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
          Prototype. Lifeline helps identify situations where you may be unable to ask for help. It
          is not a replacement for emergency services, and emergency-service escalation is simulated
          in this MVP.
        </p>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-background/95 backdrop-blur md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center gap-1 py-2 text-[10px] text-muted-foreground",
              pathname === item.to && "text-primary",
            )}
          >
            <item.icon className="size-5" />
            {item.label.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
