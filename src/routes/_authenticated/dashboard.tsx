import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FlaskConical,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LocationPanel } from "@/components/lifeline/LocationPanel";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  useActiveEmergency,
  useActiveSession,
  useContacts,
  useLastCheckIn,
  useProfile,
  useSettings,
} from "@/hooks/useLifeline";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatCountdown, formatDateTime, formatIntervalLabel, modeName } from "@/lib/lifeline";
import { completeCheckIn, requestHelp, startSession } from "@/lib/session-actions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Safety dashboard — Lifeline" },
      { name: "description", content: "Your current safety status, next check-in and emergency contacts." },
      { property: "og:title", content: "Safety dashboard — Lifeline" },
      { property: "og:description", content: "Your live Lifeline safety status." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: session } = useActiveSession();
  const { data: emergency } = useActiveEmergency();
  const { data: contacts } = useContacts();
  const { data: lastCheckIn } = useLastCheckIn();
  const { data: settings } = useSettings();
  const { coords, status, error, request } = useGeolocation();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const primary = contacts?.find((c) => c.is_primary) ?? contacts?.[0];
  const remaining = session ? new Date(session.next_checkin_at).getTime() - now : 0;

  const state = emergency
    ? "emergency"
    : session?.status === "awaiting"
      ? "checking"
      : session
        ? "monitoring"
        : "idle";

  async function refresh() {
    await queryClient.invalidateQueries();
  }

  async function onSafe() {
    setBusy(true);
    try {
      const location = await request();
      await completeCheckIn({ userId: user!.id, session, coords: location ?? coords });
      toast.success("Check-in recorded. You're safe.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onHelp() {
    setBusy(true);
    try {
      const location = await request();
      await requestHelp({
        userId: user!.id,
        userName: profile?.full_name ?? user!.email ?? null,
        session,
        coords: location ?? coords,
        lastCheckinAt: lastCheckIn?.created_at ?? null,
      });
      await refresh();
      navigate({ to: "/emergency" });
    } finally {
      setBusy(false);
    }
  }

  async function demoSession() {
    setBusy(true);
    try {
      const location = await request();
      await startSession({
        userId: user!.id,
        mode: "living_alone",
        intervalSeconds: 60,
        graceSeconds: settings?.grace_seconds ?? 60,
        coords: location ?? coords,
      });
      toast.success("Living Alone mode active — 1 minute demo check-in");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function demoMissed() {
    if (!session) {
      toast.error("Start a safety check first");
      return;
    }
    setBusy(true);
    try {
      await supabase
        .from("safety_sessions")
        .update({ next_checkin_at: new Date().toISOString(), status: "active" })
        .eq("id", session.id);
      toast.warning("Missed check-in simulated");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const statusStyles = {
    emergency: "border-danger bg-danger text-danger-foreground",
    checking: "border-warn bg-warn-soft text-warn-foreground",
    monitoring: "border-safe bg-safe-soft text-foreground",
    idle: "border-border bg-card text-foreground",
  }[state];

  return (
    <div className="space-y-6">
      <section className={`rounded-2xl border-2 p-6 shadow-panel ${statusStyles}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-widest uppercase opacity-80">Current safety status</p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold sm:text-4xl">
              {state === "emergency" ? (
                <>
                  <AlertTriangle className="size-8" />
                  EMERGENCY ACTIVE
                </>
              ) : state === "checking" ? (
                <>
                  <Clock className="size-8" />
                  Waiting for your response
                </>
              ) : (
                <>
                  <ShieldCheck className="size-8" />
                  You're safe
                </>
              )}
            </h1>
            <p className="mt-2 text-sm opacity-90">
              {state === "emergency"
                ? "Your emergency contacts are being alerted."
                : state === "checking"
                  ? "Lifeline hasn't received your check-in yet."
                  : session
                    ? `${modeName(session.mode)} mode · check-in every ${formatIntervalLabel(session.interval_seconds)}`
                    : "No safety check is running. Start one so Lifeline can watch over you."}
            </p>
          </div>
          {session && state !== "emergency" && (
            <div className="text-right">
              <p className="text-xs tracking-widest uppercase opacity-80">Next check-in</p>
              <p className="numeric text-4xl font-semibold">{formatCountdown(remaining)}</p>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <Button
            size="lg"
            className="bg-safe text-safe-foreground hover:bg-safe/90"
            onClick={onSafe}
            disabled={busy}
          >
            <CheckCircle2 className="size-5" />
            I'm Safe
          </Button>
          <Button size="lg" variant="destructive" onClick={onHelp} disabled={busy}>
            <AlertTriangle className="size-5" />
            I Need Help
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/check-in">
              <Clock className="size-5" />
              Start Safety Check
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Last check-in</p>
          <p className="mt-2 font-medium">{formatDateTime(lastCheckIn?.created_at)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {session
              ? `Next: ${formatDateTime(session.next_checkin_at)}`
              : "No scheduled check-in"}
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Active safety mode</p>
          <p className="mt-2 font-medium">{session ? modeName(session.mode) : "Not monitoring"}</p>
          {session?.mode === "travel" && (
            <p className="mt-1 text-sm text-muted-foreground">
              To {session.destination ?? "—"} · arrival {formatDateTime(session.expected_arrival)}
            </p>
          )}
        </div>
        <div className="panel p-5">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Emergency contacts</p>
          {contacts && contacts.length > 0 ? (
            <>
              <p className="mt-2 font-medium">
                {primary?.name}
                {primary?.is_primary ? " · Primary" : ""}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {contacts.length} contact{contacts.length === 1 ? "" : "s"} on file
              </p>
            </>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">No contacts yet — nobody can be alerted.</p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/contacts">
                  <Users className="size-4" />
                  Add contact
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-5">
          <h2 className="mb-3 flex items-center gap-2 font-medium">
            <MapPin className="size-4 text-primary" />
            Current location
          </h2>
          <LocationPanel
            latitude={coords?.latitude}
            longitude={coords?.longitude}
            label={coords?.label}
            capturedAt={coords?.timestamp}
            onRefresh={() => void request()}
            refreshing={status === "requesting"}
            note={
              error ??
              (status === "idle" && !coords
                ? "Lifeline reads your location only when you ask it to or when a check-in happens."
                : null)
            }
          />
        </div>

        <div className="panel border-dashed p-5">
          <h2 className="flex items-center gap-2 font-medium">
            <FlaskConical className="size-4 text-primary" />
            Demo Mode
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Prototype controls so you can show the full flow in seconds instead of hours.
          </p>
          <div className="mt-4 grid gap-2">
            <Button variant="outline" onClick={demoSession} disabled={busy}>
              Start Living Alone mode · 1-minute check-in
            </Button>
            <Button variant="outline" onClick={demoMissed} disabled={busy || !session}>
              Simulate missed check-in
            </Button>
            <Button variant="outline" onClick={onHelp} disabled={busy}>
              Simulate emergency
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/responder">Open Response Center</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
