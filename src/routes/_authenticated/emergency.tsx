import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LocationPanel } from "@/components/lifeline/LocationPanel";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  useActiveEmergency,
  useActiveSession,
  useContacts,
  useEmergencyNotifications,
} from "@/hooks/useLifeline";
import { useAuth } from "@/lib/auth-context";
import { EMERGENCY_TYPE_LABELS } from "@/lib/emergency-flow";
import { formatDateTime, formatTime, timeSince } from "@/lib/lifeline";
import { markSafe } from "@/lib/session-actions";

export const Route = createFileRoute("/_authenticated/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency mode — Lifeline" },
      { name: "description", content: "Live emergency status, your location and who is being contacted." },
      { property: "og:title", content: "Emergency mode — Lifeline" },
      { property: "og:description", content: "Live Lifeline emergency status." },
    ],
  }),
  component: EmergencyPage,
});

function EmergencyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: emergency, isLoading } = useActiveEmergency();
  const { data: session } = useActiveSession();
  const { data: contacts } = useContacts();
  const { data: notifications } = useEmergencyNotifications(emergency?.id);
  const { coords, request } = useGeolocation();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  async function close(cancelled: boolean) {
    if (!emergency) return;
    setBusy(true);
    try {
      const location = await request();
      await markSafe({
        userId: user!.id,
        emergency,
        session,
        coords: location ?? coords,
        cancelled,
      });
      toast.success(cancelled ? "Emergency cancelled" : "Marked safe. Emergency resolved.");
      await queryClient.invalidateQueries();
      navigate({ to: "/dashboard" });
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading emergency status…</p>;
  }

  if (!emergency) {
    return (
      <div className="panel mx-auto max-w-md p-6 text-center">
        <ShieldCheck className="mx-auto size-8 text-safe" />
        <h1 className="mt-3 text-xl font-semibold">No active emergency</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You're safe. Emergency mode opens automatically if Lifeline escalates.
        </p>
        <Button asChild className="mt-5">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const primary = contacts?.find((c) => c.is_primary) ?? contacts?.[0];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="animate-pulse-danger rounded-2xl border-2 border-danger bg-danger p-6 text-danger-foreground">
        <h1 className="flex items-center gap-3 text-3xl font-semibold">
          <AlertTriangle className="size-8" />
          EMERGENCY ACTIVE
        </h1>
        <p className="mt-2 text-lg">Help is being contacted.</p>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="opacity-80">Your location</dt>
            <dd className="font-medium">
              {emergency.location_label ??
                (emergency.latitude != null
                  ? `${emergency.latitude.toFixed(5)}, ${emergency.longitude?.toFixed(5)}`
                  : "Location unavailable")}
            </dd>
          </div>
          <div>
            <dt className="opacity-80">Emergency contact</dt>
            <dd className="font-medium">{primary?.name ?? "No contact on file"}</dd>
          </div>
          <div>
            <dt className="opacity-80">Started</dt>
            <dd className="font-medium">
              {formatTime(emergency.detected_at)} · {timeSince(emergency.detected_at)} ago
            </dd>
          </div>
          <div>
            <dt className="opacity-80">Response status</dt>
            <dd className="font-medium capitalize">
              {emergency.responder_status.replace("_", " ")}
            </dd>
          </div>
        </dl>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button
            size="lg"
            className="bg-card text-foreground hover:bg-card/90"
            disabled={busy}
            onClick={() => close(false)}
          >
            <CheckCircle2 className="size-5" />
            I'm Safe
          </Button>
          {confirmCancel ? (
            <div className="grid gap-2">
              <p className="text-sm">Cancel this emergency? Responders will be told it's closed.</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => close(true)}
                >
                  Yes, cancel
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 text-danger-foreground"
                  onClick={() => setConfirmCancel(false)}
                >
                  Keep active
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="lg"
              variant="outline"
              className="border-danger-foreground/40 bg-transparent text-danger-foreground hover:bg-danger-foreground/10"
              onClick={() => setConfirmCancel(true)}
            >
              <X className="size-5" />
              Cancel Emergency
            </Button>
          )}
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="font-medium">Emergency details</h2>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Emergency type</dt>
            <dd>{EMERGENCY_TYPE_LABELS[emergency.type] ?? emergency.type}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Last successful check-in</dt>
            <dd>{formatDateTime(emergency.last_checkin_at)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Emergency services (simulated)</dt>
            <dd>
              {emergency.services_notified_at
                ? `Escalation initiated ${formatTime(emergency.services_notified_at)}`
                : "Not yet escalated"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="panel p-5">
        <h2 className="font-medium">Contacts being notified</h2>
        {notifications && notifications.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm">
            {notifications.map((n) => (
              <li key={n.id} className="flex justify-between gap-3">
                <span>{n.contact_name}</span>
                <span className="text-muted-foreground">
                  Alerted in app · {formatTime(n.sent_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No contact was alerted — nobody is on file.{" "}
            <Link to="/contacts" className="underline">
              Add a contact
            </Link>
            .
          </p>
        )}
      </div>

      <div className="panel p-5">
        <h2 className="mb-3 font-medium">Location shared with responders</h2>
        <LocationPanel
          latitude={emergency.latitude}
          longitude={emergency.longitude}
          label={emergency.location_label}
          onRefresh={() => void request()}
        />
      </div>
    </div>
  );
}
