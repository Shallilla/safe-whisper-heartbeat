import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { EmergencyRow } from "@/lib/emergency-flow";

export type SessionRow = {
  id: string;
  user_id: string;
  mode: string;
  status: string;
  interval_seconds: number;
  grace_seconds: number;
  started_at: string;
  next_checkin_at: string;
  escalate_at: string | null;
  destination: string | null;
  expected_arrival: string | null;
};

export type ContactRow = {
  id: string;
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  priority: number;
  is_primary: boolean;
};

export type SettingsRow = {
  user_id: string;
  default_interval_seconds: number;
  grace_seconds: number;
  services_delay_seconds: number;
  location_sharing: boolean;
  notifications_enabled: boolean;
  preferred_mode: string;
};

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useContacts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contacts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", user!.id)
        .order("is_primary", { ascending: false })
        .order("priority", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ContactRow[];
    },
  });
}

export function useActiveSession() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["active-session", user?.id],
    enabled: !!user,
    refetchInterval: 4000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safety_sessions")
        .select("*")
        .eq("user_id", user!.id)
        .in("status", ["active", "awaiting", "escalated"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as SessionRow | null;
    },
  });
}

export function useActiveEmergency() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["active-emergency", user?.id],
    enabled: !!user,
    refetchInterval: 3000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergencies")
        .select("*")
        .eq("user_id", user!.id)
        .in("status", ["active", "responding"])
        .order("detected_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as EmergencyRow | null;
    },
  });
}

export function useLastCheckIn() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["last-checkin", user?.id],
    enabled: !!user,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_ins")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useEvents(limit = 100) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["events", user?.id, limit],
    enabled: !!user,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safety_events")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safety_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as SettingsRow;
      const inserted = await supabase
        .from("safety_settings")
        .insert({ user_id: user!.id })
        .select()
        .single();
      if (inserted.error) throw inserted.error;
      return inserted.data as SettingsRow;
    },
  });
}

export function useEmergencyNotifications(emergencyId?: string | null) {
  return useQuery({
    queryKey: ["emergency-notifications", emergencyId],
    enabled: !!emergencyId,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_notifications")
        .select("*")
        .eq("emergency_id", emergencyId!)
        .order("sent_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useResponderEmergencies(kind: "active" | "history") {
  return useQuery({
    queryKey: ["responder", kind],
    refetchInterval: 3000,
    queryFn: async () => {
      const query = supabase.from("emergencies").select("*").eq("responder_visible", true);
      const { data, error } =
        kind === "active"
          ? await query.in("status", ["active", "responding"]).order("detected_at", { ascending: false })
          : await query.eq("status", "resolved").order("resolved_at", { ascending: false }).limit(30);
      if (error) throw error;
      return (data ?? []) as EmergencyRow[];
    },
  });
}
