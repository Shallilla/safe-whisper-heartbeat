import { supabase } from "@/integrations/supabase/client";
import { logEvent, notify, type Coords } from "./lifeline";

export type EmergencyRow = {
  id: string;
  user_id: string;
  user_name: string | null;
  type: string;
  status: string;
  responder_status: string;
  detected_at: string;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  last_checkin_at: string | null;
  services_notified_at: string | null;
  response_started_at: string | null;
  resolved_at: string | null;
  resolution: string | null;
};

export const EMERGENCY_TYPE_LABELS: Record<string, string> = {
  manual: "Manual emergency",
  missed_checkin: "Missed safety check-in",
  travel_overdue: "Travel arrival overdue",
};

/** Creates an emergency, alerts stored contacts in priority order and writes history. */
export async function triggerEmergency(input: {
  userId: string;
  userName?: string | null;
  type: "manual" | "missed_checkin" | "travel_overdue";
  coords?: Coords | null;
  lastCheckinAt?: string | null;
}) {
  const { data: existing } = await supabase
    .from("emergencies")
    .select("*")
    .eq("user_id", input.userId)
    .in("status", ["active", "responding"])
    .order("detected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as EmergencyRow;

  const { data: contacts } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("user_id", input.userId)
    .order("is_primary", { ascending: false })
    .order("priority", { ascending: true });

  const { data: emergency, error } = await supabase
    .from("emergencies")
    .insert({
      user_id: input.userId,
      user_name: input.userName ?? null,
      type: input.type,
      status: "active",
      responder_status: "pending",
      latitude: input.coords?.latitude ?? null,
      longitude: input.coords?.longitude ?? null,
      location_label: input.coords?.label ?? null,
      last_checkin_at: input.lastCheckinAt ?? null,
    })
    .select()
    .single();

  if (error || !emergency) throw error ?? new Error("Could not create the emergency");

  await logEvent({
    userId: input.userId,
    eventType: "emergency_triggered",
    title:
      input.type === "manual"
        ? "Emergency triggered manually"
        : input.type === "travel_overdue"
          ? "Travel arrival overdue — emergency created"
          : "Emergency created after missed check-in",
    status: "critical",
    emergencyId: emergency.id,
    coords: input.coords ?? null,
  });

  if (contacts && contacts.length > 0) {
    for (const contact of contacts) {
      await supabase.from("emergency_notifications").insert({
        emergency_id: emergency.id,
        user_id: input.userId,
        contact_id: contact.id,
        contact_name: contact.name,
        notification_type: "in_app",
        status: "sent",
      });
      await logEvent({
        userId: input.userId,
        eventType: "contact_notified",
        title: `Emergency contact notified: ${contact.name}`,
        detail: contact.is_primary ? "Primary contact — alerted first" : contact.relationship,
        status: "warning",
        emergencyId: emergency.id,
      });
    }
  } else {
    await logEvent({
      userId: input.userId,
      eventType: "contact_missing",
      title: "No emergency contact on file",
      detail: "Lifeline could not alert anyone. Add a contact so this doesn't happen again.",
      status: "warning",
      emergencyId: emergency.id,
    });
  }

  notify("Lifeline: emergency active", "Your emergency contacts are being alerted.");
  return emergency as EmergencyRow;
}

export async function escalateToServices(emergency: EmergencyRow) {
  await supabase
    .from("emergencies")
    .update({ services_notified_at: new Date().toISOString(), responder_status: "services_alerted" })
    .eq("id", emergency.id);
  await logEvent({
    userId: emergency.user_id,
    eventType: "services_escalation",
    title: "Emergency services escalation initiated (simulated)",
    detail: "Prototype: no real emergency service was contacted.",
    status: "critical",
    emergencyId: emergency.id,
  });
}

export async function startResponse(emergency: EmergencyRow) {
  await supabase
    .from("emergencies")
    .update({
      status: "responding",
      responder_status: "responding",
      response_started_at: new Date().toISOString(),
    })
    .eq("id", emergency.id);
  await logEvent({
    userId: emergency.user_id,
    eventType: "response_started",
    title: "Response started",
    detail: "A responder confirmed they are acting on this emergency.",
    status: "warning",
    emergencyId: emergency.id,
  });
}

export async function resolveEmergency(emergency: EmergencyRow, resolution: string) {
  await supabase
    .from("emergencies")
    .update({
      status: "resolved",
      responder_status: "resolved",
      resolved_at: new Date().toISOString(),
      resolution,
    })
    .eq("id", emergency.id);
  await logEvent({
    userId: emergency.user_id,
    eventType: "emergency_resolved",
    title: "Emergency resolved",
    detail: resolution,
    status: "ok",
    emergencyId: emergency.id,
  });
}
