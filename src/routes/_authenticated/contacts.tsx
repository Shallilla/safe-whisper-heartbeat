import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Star, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContacts } from "@/hooks/useLifeline";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/contacts")({
  head: () => ({
    meta: [
      { title: "Emergency contacts — Lifeline" },
      { name: "description", content: "Manage the people Lifeline alerts when you can't respond." },
      { property: "og:title", content: "Emergency contacts — Lifeline" },
      { property: "og:description", content: "Manage who Lifeline alerts on your behalf." },
    ],
  }),
  component: ContactsPage,
});

type Draft = {
  id?: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  priority: number;
  is_primary: boolean;
};

const empty: Draft = {
  name: "",
  relationship: "",
  phone: "",
  email: "",
  priority: 2,
  is_primary: false,
};

function ContactsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: contacts, isLoading } = useContacts();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!draft?.name.trim()) {
      toast.error("A name is required");
      return;
    }
    if (!draft.phone.trim() && !draft.email.trim()) {
      toast.error("Add a phone number or an email");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        user_id: user!.id,
        name: draft.name.trim(),
        relationship: draft.relationship.trim() || null,
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        priority: draft.priority,
        is_primary: draft.is_primary,
      };
      if (draft.is_primary) {
        await supabase
          .from("emergency_contacts")
          .update({ is_primary: false })
          .eq("user_id", user!.id);
      }
      const { error } = draft.id
        ? await supabase.from("emergency_contacts").update(payload).eq("id", draft.id)
        : await supabase.from("emergency_contacts").insert(payload);
      if (error) throw error;
      toast.success(draft.id ? "Contact updated" : "Contact added");
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the contact");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete the contact");
      return;
    }
    toast.success("Contact deleted");
    await queryClient.invalidateQueries({ queryKey: ["contacts"] });
  }

  async function makePrimary(id: string) {
    await supabase.from("emergency_contacts").update({ is_primary: false }).eq("user_id", user!.id);
    await supabase
      .from("emergency_contacts")
      .update({ is_primary: true, priority: 1 })
      .eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["contacts"] });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Emergency contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your primary contact is alerted first, then the others in priority order.
          </p>
        </div>
        <Button onClick={() => setDraft({ ...empty })}>
          <Plus className="size-4" />
          Add contact
        </Button>
      </div>

      {draft && (
        <div className="panel space-y-4 p-5">
          <h2 className="font-medium">{draft.id ? "Edit contact" : "New contact"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="relationship">Relationship</Label>
              <Input
                id="relationship"
                value={draft.relationship}
                onChange={(e) => setDraft({ ...draft, relationship: e.target.value })}
                placeholder="Sister, flatmate, friend"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority (1 = first)</Label>
              <Input
                id="priority"
                type="number"
                min={1}
                max={9}
                value={draft.priority}
                onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) || 2 })}
              />
            </div>
            <label className="flex items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                checked={draft.is_primary}
                onChange={(e) => setDraft({ ...draft, is_primary: e.target.checked })}
                className="size-4 accent-primary"
              />
              Primary contact
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy}>
              Save contact
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading contacts…</p>
      ) : contacts && contacts.length > 0 ? (
        <ul className="space-y-3">
          {contacts.map((c) => (
            <li
              key={c.id}
              className={cn("panel flex flex-wrap items-center gap-3 p-4", c.is_primary && "border-primary")}
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  {c.name}
                  {c.is_primary && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                      Primary
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[c.relationship, c.phone, c.email].filter(Boolean).join(" · ")}
                </p>
                <p className="text-xs text-muted-foreground">Priority {c.priority}</p>
              </div>
              <div className="flex gap-1">
                {!c.is_primary && (
                  <Button variant="ghost" size="sm" onClick={() => makePrimary(c.id)}>
                    <Star className="size-4" />
                    Make primary
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setDraft({
                      id: c.id,
                      name: c.name,
                      relationship: c.relationship ?? "",
                      phone: c.phone ?? "",
                      email: c.email ?? "",
                      priority: c.priority,
                      is_primary: c.is_primary,
                    })
                  }
                >
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>
                  <Trash2 className="size-4 text-danger" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel p-8 text-center">
          <Users className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No emergency contacts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Lifeline needs at least one person to alert if you can't respond.
          </p>
          <Button className="mt-4" onClick={() => setDraft({ ...empty, is_primary: true })}>
            <Plus className="size-4" />
            Add your first contact
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Prototype: alerts are shown inside Lifeline and in the Response Center. No real SMS or email
        is sent.
      </p>
    </div>
  );
}
