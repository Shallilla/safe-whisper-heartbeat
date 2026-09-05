import { supabase } from "@/integrations/supabase/client";

export type Coords = {
  latitude: number;
  longitude: number;
  label?: string | null;
  timestamp?: string;
};

export type SafetyMode = "standard" | "living_alone" | "travel";

export const MODES: { id: SafetyMode; name: string; description: string }[] = [
  {
    id: "standard",
    name: "Standard",
    description: "Normal safety monitoring with regular check-ins.",
  },
  {
    id: "living_alone",
    name: "Living Alone",
    description:
      "Regular check-ins while you're on your own. If you don't respond, Lifeline escalates.",
  },
  {
    id: "travel",
    name: "Travel",
    description:
      "Set a destination and expected arrival. If the time passes without a check-in, Lifeline escalates.",
  },
];

export const INTERVAL_PRESETS: { label: string; seconds: number; hint?: string }[] = [
  { label: "1 minute", seconds: 60, hint: "Demo speed" },
  { label: "30 minutes", seconds: 1800 },
  { label: "1 hour", seconds: 3600 },
  { label: "2 hours", seconds: 7200 },
  { label: "4 hours", seconds: 14400 },
];

export function modeName(mode: string | null | undefined) {
  return MODES.find((m) => m.id === mode)?.name ?? "Standard";
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatShortCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatIntervalLabel(seconds: number) {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) {
    const m = Math.round(seconds / 60);
    return `${m} minute${m === 1 ? "" : "s"}`;
  }
  const h = seconds / 3600;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hour${h === 1 ? "" : "s"}`;
}

export function formatTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeSince(value?: string | null) {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "less than a minute";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function coordsLabel(
  latitude?: number | null,
  longitude?: number | null,
  label?: string | null,
) {
  if (label) return label;
  if (latitude == null || longitude == null) return "Location unavailable";
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function mapsUrl(latitude?: number | null, longitude?: number | null) {
  if (latitude == null || longitude == null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export type EventStatus = "ok" | "warning" | "critical" | "info";

export async function logEvent(input: {
  userId: string;
  eventType: string;
  title: string;
  detail?: string | null;
  status?: EventStatus;
  emergencyId?: string | null;
  coords?: Coords | null;
}) {
  await supabase.from("safety_events").insert({
    user_id: input.userId,
    event_type: input.eventType,
    title: input.title,
    detail: input.detail ?? null,
    status: input.status ?? "info",
    emergency_id: input.emergencyId ?? null,
    latitude: input.coords?.latitude ?? null,
    longitude: input.coords?.longitude ?? null,
  });
}

export function notify(title: string, body: string) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch {
    /* notifications are best-effort */
  }
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}
