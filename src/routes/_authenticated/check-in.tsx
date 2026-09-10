import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  useActiveSession,
  useLastCheckIn,
  useProfile,
  useSettings,
} from "@/hooks/useLifeline";
import { useAuth } from "@/lib/auth-context";
import {
  INTERVAL_PRESETS,
  MODES,
  formatCountdown,
  formatDateTime,
  formatIntervalLabel,
  modeName,
} from "@/lib/lifeline";
import { completeCheckIn, endSession, requestHelp, startSession } from "@/lib/session-actions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/check-in")({
  head: () => ({
    meta: [
      { title: "Safety check-in — Lifeline" },
      { name: "description", content: "Start a safety check, pick your interval and complete check-ins." },
      { property: "og:title", content: "Safety check-in — Lifeline" },
      { property: "og:description", content: "Start and complete Lifeline safety check-ins." },
    ],
  }),
  component: CheckInPage,
});

function CheckInPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useActiveSession();
  const { data: settings } = useSettings();
  const { data: profile } = useProfile();
  const { data: lastCheckIn } = useLastCheckIn();
  const { coords, request } = useGeolocation();

  const [mode, setMode] = useState("living_alone");
  const [interval, setIntervalSeconds] = useState(3600);
  const [custom, setCustom] = useState("");
  const [destination, setDestination] = useState("");
  const [arrival, setArrival] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (settings) {
      setIntervalSeconds(settings.default_interval_seconds);
      setMode(settings.preferred_mode);
    }
  }, [settings]);

  const remaining = session ? new Date(session.next_checkin_at).getTime() - now : 0;

  async function start() {
    setBusy(true);
    try {
      const seconds = custom ? Math.max(30, Math.round(Number(custom) * 60)) : interval;
      if (mode === "travel" && (!destination || !arrival)) {
        toast.error("Add a destination and expected arrival time");
        return;
      }
      const location = await request();
      await startSession({
        userId: user!.id,
        mode,
        intervalSeconds: seconds,
        graceSeconds: settings?.grace_seconds ?? 60,
        destination: mode === "travel" ? destination : null,
        expectedArrival: mode === "travel" ? new Date(arrival).toISOString() : null,
        coords: location ?? coords,
      });
      toast.success(`${modeName(mode)} mode active`);
      await queryClient.invalidateQueries();
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the safety check");
    } finally {
      setBusy(false);
    }
  }

  if (session) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="panel p-6 text-center">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            {modeName(session.mode)} mode active
          </p>
          <h1 className="mt-2 text-xl font-semibold">Next check-in in</h1>
          <p className="numeric mt-3 text-5xl font-semibold">{formatCountdown(remaining)}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Every {formatIntervalLabel(session.interval_seconds)} · grace period{" "}
            {session.grace_seconds}s
          </p>
          {session.mode === "travel" && (
            <p className="mt-1 text-sm text-muted-foreground">
              Travel Mode Active — {session.destination} by{" "}
              {formatDateTime(session.expected_arrival)}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Last check-in: {formatDateTime(lastCheckIn?.created_at)}
          </p>

          <div className="mt-6 grid gap-2">
            <Button
              size="lg"
              className="bg-safe text-safe-foreground hover:bg-safe/90"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const location = await request();
                  await completeCheckIn({ userId: user!.id, session, coords: location ?? coords });
                  toast.success("Check-in recorded");
                  await queryClient.invalidateQueries();
                } finally {
                  setBusy(false);
                }
              }}
            >
              <CheckCircle2 className="size-5" />
              I'm Safe
            </Button>
            <Button
              size="lg"
              variant="destructive"
              disabled={busy}
              onClick={async () => {
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
                  await queryClient.invalidateQueries();
                  navigate({ to: "/emergency" });
                } finally {
                  setBusy(false);
                }
              }}
            >
              <AlertTriangle className="size-5" />
              I Need Help
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                await endSession(session);
                toast.info("Safety check stopped");
                await queryClient.invalidateQueries();
              }}
            >
              <Square className="size-4" />
              Stop monitoring
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Start a safety check</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lifeline will ask you to confirm you're safe. If you don't respond, it escalates to your
          emergency contacts.
        </p>
      </div>

      <div className="panel space-y-3 p-5">
        <Label>Safety mode</Label>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn(
              "w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted",
              mode === m.id && "border-primary bg-accent",
            )}
          >
            <p className="font-medium">{m.name}</p>
            <p className="text-sm text-muted-foreground">{m.description}</p>
          </button>
        ))}
      </div>

      {mode === "travel" && (
        <div className="panel space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Casablanca city centre"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="arrival">Expected arrival</Label>
            <Input
              id="arrival"
              type="datetime-local"
              value={arrival}
              onChange={(e) => setArrival(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="panel space-y-3 p-5">
        <Label>Check-in interval</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INTERVAL_PRESETS.map((p) => (
            <button
              key={p.seconds}
              type="button"
              onClick={() => {
                setIntervalSeconds(p.seconds);
                setCustom("");
              }}
              className={cn(
                "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted",
                !custom && interval === p.seconds && "border-primary bg-accent font-medium",
              )}
            >
              {p.label}
              {p.hint && <span className="block text-xs text-muted-foreground">{p.hint}</span>}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="custom">Custom (minutes)</Label>
          <Input
            id="custom"
            type="number"
            min={1}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="e.g. 90"
          />
        </div>
      </div>

      <Button size="lg" className="w-full" onClick={start} disabled={busy}>
        <Clock className="size-5" />
        Start safety check
      </Button>
    </div>
  );
}
