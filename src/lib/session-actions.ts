import { supabase } from "@/integrations/supabase/client";
import { resolveEmergency, triggerEmergency, type EmergencyRow } from "./emergency-flow";
import type { SessionRow } from "@/hooks/useLifeline";
import { formatIntervalLabel, logEvent, modeName, type Coords } from "./lifeline";

export async function startSession(input: {
  userId: string;
  mode: string;
  intervalSeconds: number;
  graceSeconds: number;
  destination?: string | null | undefined;
  expectedArrival?: string | null | undefined;
  coords?: Coords | null | undefined;
}) {
  await supabase
    .from("safety_sessions")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("user_id", input.userId)
    .in("status", ["active", "awaiting", "escalated"]);

  const now = Date.now();
  const next =
    input.mode === "travel" && input.expectedArrival
      ? new Date(input.expectedArrival).toISOString()
      : new Date(now + input.intervalSeconds * 1000).toISOString();

  const { data, error } = await supabase
    .from("safety_sessions")
    .insert({
      user_id: input.userId,
      mode: input.mode,
      status: "active",
      interval_seconds: input.intervalSeconds,
      grace_seconds: input.graceSeconds,
      next_checkin_at: next,
      destination: input.destination ?? null,
      expected_arrival: input.expectedArrival ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  await logEvent({
    userId: input.userId,
    eventType: "session_started",
    title: `${modeName(input.mode)} safety check started`,
    detail:
      input.mode === "travel"
        ? `Destination ${input.destination ?? "unspecified"}, expected arrival ${
            input.expectedArrival ? new Date(input.expectedArrival).toLocaleString() : "unspecified"
          }`
        : `Check-in every ${formatIntervalLabel(input.intervalSeconds)}`,
    status: "ok",
    coords: input.coords ?? null,
  });

  if (input.coords) {
    await logEvent({
      userId: input.userId,
      eventType: "location_update",
      title: "Location updated",
      detail: input.coords.label ?? null,
      status: "info",
      coords: input.coords,
    });
  }

  return data as SessionRow;
}

export async function completeCheckIn(input: {
  userId: string;
  session?: SessionRow | null | undefined;
  coords?: Coords | null | undefined;
  detail?: string | undefined;
}) {
  await supabase.from("check_ins").insert({
    user_id: input.userId,
    session_id: input.session?.id ?? null,
    status: "completed",
    latitude: input.coords?.latitude ?? null,
    longitude: input.coords?.longitude ?? null,
  });

  await logEvent({
    userId: input.userId,
    eventType: "checkin_completed",
    title: "Safety check completed",
    detail: input.detail ?? input.coords?.label ?? null,
    status: "ok",
    coords: input.coords ?? null,
  });

  if (input.session) {
    await supabase
      .from("safety_sessions")
      .update({
        status: "active",
        escalate_at: null,
        next_checkin_at: new Date(Date.now() + input.session.interval_seconds * 1000).toISOString(),
      })
      .eq("id", input.session.id);
  }
}

export async function endSession(session: SessionRow) {
  await supabase
    .from("safety_sessions")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", session.id);
  await logEvent({
    userId: session.user_id,
    eventType: "session_ended",
    title: "Safety check stopped",
    status: "info",
  });
}

export async function markMissedCheckIn(session: SessionRow) {
  await supabase.from("check_ins").insert({
    user_id: session.user_id,
    session_id: session.id,
    status: "missed",
  });
  await supabase
    .from("safety_sessions")
    .update({
      status: "awaiting",
      escalate_at: new Date(Date.now() + session.grace_seconds * 1000).toISOString(),
    })
    .eq("id", session.id);
  await logEvent({
    userId: session.user_id,
    eventType: "checkin_missed",
    title: "Check-in missed",
    detail: `Lifeline is waiting ${session.grace_seconds} seconds for a response before escalating.`,
    status: "warning",
  });
}

export async function requestHelp(input: {
  userId: string;
  userName?: string | null | undefined;
  session?: SessionRow | null | undefined;
  coords?: Coords | null | undefined;
  lastCheckinAt?: string | null | undefined;
  type?: "manual" | "missed_checkin" | "travel_overdue";
}) {
  const emergency = await triggerEmergency({
    userId: input.userId,
    userName: input.userName ?? null,
    type: input.type ?? "manual",
    coords: input.coords ?? null,
    lastCheckinAt: input.lastCheckinAt ?? null,
  });
  if (input.session) {
    await supabase
      .from("safety_sessions")
      .update({ status: "escalated" })
      .eq("id", input.session.id);
  }
  return emergency;
}

export async function markSafe(input: {
  userId: string;
  emergency: EmergencyRow;
  session?: SessionRow | null | undefined;
  coords?: Coords | null | undefined;
  cancelled?: boolean | undefined;
}) {
  await resolveEmergency(
    input.emergency,
    input.cancelled
      ? "Cancelled by the person before help arrived"
      : "The person marked themselves safe",
  );
  await completeCheckIn({
    userId: input.userId,
    session: input.session ?? null,
    coords: input.coords ?? null,
    detail: "Confirmed safe after an emergency",
  });
}
