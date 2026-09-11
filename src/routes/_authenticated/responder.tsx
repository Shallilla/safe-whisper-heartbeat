import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, PhoneCall, Play, ShieldCheck, Siren } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { MiniMap } from "@/components/lifeline/LocationPanel";
import { Button } from "@/components/ui/button";
import { useResponderEmergencies } from "@/hooks/useLifeline";
import { EMERGENCY_TYPE_LABELS, resolveEmergency, startResponse } from "@/lib/emergency-flow";
import type { EmergencyRow } from "@/lib/emergency-flow";
import { formatDateTime, timeSince } from "@/lib/lifeline";

export const Route = createFileRoute("/_authenticated/responder")({
  head: () => ({
    meta: [
      { title: "Response Center — Lifeline" },
      { name: "description", content: "Emergency contact view: active emergencies, locations and response actions." },
      { property: "og:title", content: "Response Center — Lifeline" },
      { property: "og:description", content: "Respond to Lifeline emergencies as an emergency contact." },
    ],
  }),
  component: ResponderPage,
});

function ResponderPage() {
  const queryClient = useQueryClient();
  const { data: active = [], isLoading } = useResponderEmergencies("active");
  const { data: history = [] } = useResponderEmergencies("history");
  const [busy, setBusy] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  async function act(emergency: EmergencyRow, action: "start" | "resolve") {
    setBusy(emergency.id);
    try {
      if (action === "start") {
        await startResponse(emergency);
        toast.success("Response started");
      } else {
        await resolveEmergency(emergency, "Resolved by responder");
        toast.success("Emergency resolved");
      }
      await queryClient.invalidateQueries();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Siren className="size-6 text-danger" />
        <div>
          <h1 className="text-2xl font-semibold">Lifeline Response Center</h1>
          <p className="text-sm text-muted-foreground">
            Emergency contact view. Only emergencies shared with responders appear here.
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Active emergencies
        </h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading emergencies…</p>
        ) : active.length === 0 ? (
          <div className="panel p-8 text-center">
            <ShieldCheck className="mx-auto size-8 text-safe" />
            <p className="mt-3 font-medium">No active emergencies</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Everyone you're responsible for is currently safe.
            </p>
          </div>
        ) : (
          active.map((e) => (
            <article key={e.id} className="rounded-2xl border-2 border-danger bg-card p-5 shadow-panel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium tracking-widest text-danger uppercase">
                    Possible Emergency Detected
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">{e.user_name ?? "Lifeline user"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {EMERGENCY_TYPE_LABELS[e.type] ?? e.type} ·{" "}
                    {e.services_notified_at ? "Emergency Response Requested" : "Contacts alerted"}
                  </p>
                </div>
                <span className="rounded-full bg-danger-soft px-3 py-1 text-xs font-medium text-danger capitalize">
                  {e.responder_status.replace("_", " ")}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Detected</dt>
                  <dd>
                    {formatDateTime(e.detected_at)} · {timeSince(e.detected_at)} ago
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last check-in</dt>
                  <dd>{formatDateTime(e.last_checkin_at)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Safety status</dt>
                  <dd className="capitalize">{e.status}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Time since response started</dt>
                  <dd>
                    {e.response_started_at ? `${timeSince(e.response_started_at)} ago` : "Not started"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Last known location</dt>
                  <dd>
                    {e.latitude != null
                      ? (e.location_label ??
                        `${e.latitude.toFixed(5)}, ${e.longitude?.toFixed(5)}`)
                      : "Location unavailable"}
                  </dd>
                </div>
              </dl>

              {e.latitude != null && e.longitude != null && (
                <div className="mt-4">
                  <MiniMap latitude={e.latitude} longitude={e.longitude} />
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {e.latitude != null && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${e.latitude}&mlon=${e.longitude}#map=17/${e.latitude}/${e.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin className="size-4" />
                      View Location
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast.info("Calling is simulated in this prototype — no call is placed.")
                  }
                >
                  <PhoneCall className="size-4" />
                  Contact Person
                </Button>
                <Button
                  size="sm"
                  disabled={busy === e.id || e.responder_status === "responding"}
                  onClick={() => act(e, "start")}
                >
                  <Play className="size-4" />
                  Mark Response Started
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy === e.id}
                  onClick={() => act(e, "resolve")}
                >
                  <ShieldCheck className="size-4" />
                  Resolve Emergency
                </Button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Resolved history
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No resolved emergencies yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((e) => (
              <li key={e.id} className="panel flex flex-wrap items-center gap-3 p-4 text-sm">
                <span className="flex-1 font-medium">{e.user_name ?? "Lifeline user"}</span>
                <span className="text-muted-foreground">
                  {EMERGENCY_TYPE_LABELS[e.type] ?? e.type} · detected {formatDateTime(e.detected_at)}
                </span>
                <span className="rounded-full bg-safe-soft px-2.5 py-1 text-xs font-medium text-safe">
                  {e.resolution ?? "Resolved"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Prototype: alerts appear in-app only, and emergency services escalation is simulated.
      </p>
    </div>
  );
}
