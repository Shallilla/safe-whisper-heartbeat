import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, Home, MapPin, Plane, ShieldAlert, ShieldCheck, Timer, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lifeline — help when you can't ask for it" },
      {
        name: "description",
        content:
          "Lifeline detects when something may be wrong, checks if you're safe, and alerts the people who can help.",
      },
      { property: "og:title", content: "Lifeline — help when you can't ask for it" },
      {
        property: "og:description",
        content:
          "Safety check-ins, escalation to your emergency contacts, and a live response center.",
      },
    ],
  }),
  component: Landing,
});

const USE_CASES = [
  {
    icon: Home,
    title: "Living Alone",
    body: "If something happens while you're alone, Lifeline can check on you and escalate if you don't respond.",
  },
  {
    icon: Plane,
    title: "Traveling Alone",
    body: "Set a destination and expected return time. Lifeline can monitor your safety status.",
  },
  {
    icon: ShieldAlert,
    title: "Emergency",
    body: "Trigger an emergency manually or allow Lifeline to escalate a missed safety check.",
  },
];

const FLOW = [
  { icon: Timer, label: "Detect", body: "A check-in is missed or an emergency is triggered." },
  { icon: BellRing, label: "Check", body: "Lifeline asks whether you're safe and waits." },
  { icon: Users, label: "Escalate", body: "Your emergency contacts are alerted in priority order." },
  { icon: MapPin, label: "Locate", body: "Your last known location is shared with responders." },
  { icon: ShieldCheck, label: "Respond", body: "A responder starts and resolves the emergency." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <span className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-5 text-primary" />
          Lifeline
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-3xl px-4 pt-10 pb-16 text-center sm:pt-16">
        <p className="mb-4 inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          Prototype — emergency services are simulated
        </p>
        <h1 className="text-4xl leading-tight font-semibold sm:text-5xl">
          Help when you need it. Even when you can't ask for it.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Lifeline helps detect when something may be wrong, checks if you're safe, and alerts the
          people who can help.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/auth">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#how-it-works">See how it works</a>
          </Button>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-border bg-surface py-14">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-2xl font-semibold">Detect → Check → Escalate → Locate → Respond</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {FLOW.map((step, i) => (
              <div key={step.label} className="panel p-4">
                <step.icon className="size-5 text-primary" />
                <p className="numeric mt-3 text-xs text-muted-foreground">Step {i + 1}</p>
                <h3 className="font-medium">{step.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-2xl font-semibold">Built for three situations</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {USE_CASES.map((c) => (
            <div key={c.title} className="panel p-5">
              <c.icon className="size-5 text-primary" />
              <h3 className="mt-3 text-lg font-medium">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-8 text-xs leading-relaxed text-muted-foreground">
          <p>
            Lifeline helps identify situations where you may be unable to ask for help. It is not a
            replacement for emergency services and does not reliably detect medical emergencies. In
            this prototype, escalation to emergency services is simulated and no real emergency
            service is contacted.
          </p>
        </div>
      </footer>
    </div>
  );
}
