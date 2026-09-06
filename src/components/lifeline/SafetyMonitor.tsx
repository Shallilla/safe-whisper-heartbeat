import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { readLastLocation } from "@/hooks/useGeolocation";
import {
  useActiveEmergency,
  useActiveSession,
  useLastCheckIn,
  useProfile,
  useSettings,
} from "@/hooks/useLifeline";
import { useAuth } from "@/lib/auth-context";
import { escalateToServices } from "@/lib/emergency-flow";
import { formatShortCountdown, notify } from "@/lib/lifeline";
import { completeCheckIn, markMissedCheckIn, requestHelp } from "@/lib/session-actions";

/**
 * The escalation engine. Mounted for every signed-in page so the countdown and
 * escalation keep running while the person moves around the app.
 */
export function SafetyMonitor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useActiveSession();
  const { data: emergency } = useActiveEmergency();
  const { data: settings } = useSettings();
  const { data: profile } = useProfile();
  const { data: lastCheckIn } = useLastCheckIn();
  const [now, setNow] = useState(() => Date.now());
  const working = useRef(false);
  const promptedRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user || working.current) return;
    const run = async () => {
      working.current = true;
      try {
        let changed = false;

        if (session && session.status === "active" && now >= new Date(session.next_checkin_at).getTime()) {
          await markMissedCheckIn(session);
          notify("Are you safe?", "Lifeline hasn't received your check-in.");
          changed = true;
        } else if (
          session &&
          session.status === "awaiting" &&
          session.escalate_at &&
          now >= new Date(session.escalate_at).getTime() &&
          !emergency
        ) {
          const created = await requestHelp({
            userId: user.id,
            userName: profile?.full_name ?? user.email ?? null,
            session,
            coords: readLastLocation(),
            lastCheckinAt: lastCheckIn?.created_at ?? null,
            type: session.mode === "travel" ? "travel_overdue" : "missed_checkin",
          });
          toast.error("Emergency contact is being alerted");
          changed = true;
          await queryClient.invalidateQueries();
          if (created) navigate({ to: "/emergency" });
        } else if (
          emergency &&
          !emergency.services_notified_at &&
          now >=
            new Date(emergency.detected_at).getTime() +
              (settings?.services_delay_seconds ?? 60) * 1000
        ) {
          await escalateToServices(emergency);
          changed = true;
        } else if (session && session.status === "escalated" && !emergency) {
          await completeCheckIn({ userId: user.id, session, detail: "Emergency closed" });
          changed = true;
        }

        if (changed) await queryClient.invalidateQueries();
      } catch (error) {
        console.error(error);
      } finally {
        working.current = false;
      }
    };
    void run();
  }, [now, session, emergency, settings, user, profile, lastCheckIn, queryClient, navigate]);

  const awaiting = session?.status === "awaiting" && !emergency;

  useEffect(() => {
    if (awaiting && session && promptedRef.current !== session.id + session.escalate_at) {
      promptedRef.current = session.id + session.escalate_at;
    }
  }, [awaiting, session]);

  if (!awaiting || !session) return null;

  const remaining = session.escalate_at ? new Date(session.escalate_at).getTime() - now : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border-2 border-warn bg-card p-6 text-center shadow-panel">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-warn-soft">
          <AlertTriangle className="size-6 text-warn" />
        </div>
        <h2 className="text-2xl font-semibold">Are you safe?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We haven't received your check-in. If you don't respond, your emergency contact will be
          alerted.
        </p>
        <p className="numeric mt-5 text-5xl font-semibold text-warn">
          {formatShortCountdown(remaining)}
        </p>
        <div className="mt-6 grid gap-2">
          <Button
            size="lg"
            className="bg-safe text-safe-foreground hover:bg-safe/90"
            onClick={async () => {
              await completeCheckIn({
                userId: user!.id,
                session,
                coords: readLastLocation(),
                detail: "Responded to a missed check-in prompt",
              });
              toast.success("Check-in recorded. You're safe.");
              await queryClient.invalidateQueries();
            }}
          >
            I'm Safe
          </Button>
          <Button
            size="lg"
            variant="destructive"
            onClick={async () => {
              await requestHelp({
                userId: user!.id,
                userName: profile?.full_name ?? user!.email ?? null,
                session,
                coords: readLastLocation(),
                lastCheckinAt: lastCheckIn?.created_at ?? null,
              });
              await queryClient.invalidateQueries();
              navigate({ to: "/emergency" });
            }}
          >
            I Need Help
          </Button>
        </div>
      </div>
    </div>
  );
}
