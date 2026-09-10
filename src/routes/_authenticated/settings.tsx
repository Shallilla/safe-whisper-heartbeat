import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContacts, useSettings } from "@/hooks/useLifeline";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { MODES, requestNotificationPermission } from "@/lib/lifeline";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Safety settings — Lifeline" },
      { name: "description", content: "Set your check-in interval, grace period, location sharing and escalation." },
      { property: "og:title", content: "Safety settings — Lifeline" },
      { property: "og:description", content: "Tune how Lifeline checks on you and escalates." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useSettings();
  const { data: contacts } = useContacts();
  const [form, setForm] = useState({
    intervalMinutes: 60,
    graceSeconds: 60,
    servicesDelaySeconds: 60,
    locationSharing: true,
    notificationsEnabled: true,
    preferredMode: "living_alone",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        intervalMinutes: Math.round(settings.default_interval_seconds / 60),
        graceSeconds: settings.grace_seconds,
        servicesDelaySeconds: settings.services_delay_seconds,
        locationSharing: settings.location_sharing,
        notificationsEnabled: settings.notifications_enabled,
        preferredMode: settings.preferred_mode,
      });
    }
  }, [settings]);

  async function save() {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("safety_settings")
        .update({
          default_interval_seconds: Math.max(60, form.intervalMinutes * 60),
          grace_seconds: Math.max(10, form.graceSeconds),
          services_delay_seconds: Math.max(10, form.servicesDelaySeconds),
          location_sharing: form.locationSharing,
          notifications_enabled: form.notificationsEnabled,
          preferred_mode: form.preferredMode,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user!.id);
      if (error) throw error;
      if (form.notificationsEnabled) await requestNotificationPermission();
      toast.success("Settings saved");
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading settings…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Safety settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These decide how often Lifeline checks on you and how quickly it escalates.
        </p>
      </div>

      <div className="panel space-y-5 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="interval">Default check-in interval (minutes)</Label>
          <Input
            id="interval"
            type="number"
            min={1}
            value={form.intervalMinutes}
            onChange={(e) => setForm({ ...form, intervalMinutes: Number(e.target.value) || 60 })}
          />
          <p className="text-xs text-muted-foreground">
            How long between the moments Lifeline asks you to confirm you're safe.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="grace">Grace period (seconds)</Label>
          <Input
            id="grace"
            type="number"
            min={10}
            value={form.graceSeconds}
            onChange={(e) => setForm({ ...form, graceSeconds: Number(e.target.value) || 60 })}
          />
          <p className="text-xs text-muted-foreground">
            Extra time to answer "Are you safe?" before your contacts are alerted.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="services">Emergency services delay (seconds)</Label>
          <Input
            id="services"
            type="number"
            min={10}
            value={form.servicesDelaySeconds}
            onChange={(e) =>
              setForm({ ...form, servicesDelaySeconds: Number(e.target.value) || 60 })
            }
          />
          <p className="text-xs text-muted-foreground">
            After your contacts are alerted, how long before the simulated emergency services
            escalation starts.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Preferred safety mode</Label>
          <div className="grid gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setForm({ ...form, preferredMode: m.id })}
                className={`rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted ${
                  form.preferredMode === m.id ? "border-primary bg-accent" : "border-border"
                }`}
              >
                <span className="font-medium">{m.name}</span>
                <span className="block text-muted-foreground">{m.description}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.locationSharing}
            onChange={(e) => setForm({ ...form, locationSharing: e.target.checked })}
            className="mt-1 size-4 accent-primary"
          />
          <span>
            <span className="font-medium">Share my location during check-ins and emergencies</span>
            <span className="block text-muted-foreground">
              Location is read only at those moments. There is no background tracking.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.notificationsEnabled}
            onChange={(e) => setForm({ ...form, notificationsEnabled: e.target.checked })}
            className="mt-1 size-4 accent-primary"
          />
          <span>
            <span className="font-medium">Browser notifications</span>
            <span className="block text-muted-foreground">
              Alerts you when a check-in is due even if this tab is in the background.
            </span>
          </span>
        </label>

        <Button onClick={save} disabled={busy} className="w-full">
          Save settings
        </Button>
      </div>

      <div className="panel p-5">
        <h2 className="font-medium">Emergency contact</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {contacts && contacts.length > 0
            ? `${contacts.find((c) => c.is_primary)?.name ?? contacts[0]?.name} is alerted first.`
            : "No contact on file yet — nobody can be alerted."}
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link to="/contacts">Manage contacts</Link>
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Lifeline is an MVP prototype and not a replacement for emergency services. It helps identify
        situations where you may be unable to ask for help, and does not reliably detect medical
        emergencies. Emergency services contact is simulated.
      </p>
    </div>
  );
}
