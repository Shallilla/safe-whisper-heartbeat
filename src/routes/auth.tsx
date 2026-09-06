import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Lifeline" },
      { name: "description", content: "Create your Lifeline account or sign in to your safety dashboard." },
      { property: "og:title", content: "Sign in — Lifeline" },
      { property: "og:description", content: "Access your Lifeline safety dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [session, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="panel w-full max-w-md p-6">
        <div className="mb-6 flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-5 text-primary" />
          Lifeline
        </div>
        <h1 className="text-2xl font-semibold">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Set up Lifeline so it can check on you and alert someone if you don't respond."
            : "Sign in to your safety dashboard."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Alex Johnson"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+212 6 00 00 00 00"
                />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>

        <Button variant="outline" className="mt-3 w-full" onClick={google}>
          Continue with Google
        </Button>

        <button
          type="button"
          className="mt-5 w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup" ? "I already have an account" : "I need to create an account"}
        </button>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Prototype. Lifeline helps identify situations where you may be unable to ask for help. It
          is not a replacement for emergency services.
        </p>
      </div>
    </div>
  );
}
