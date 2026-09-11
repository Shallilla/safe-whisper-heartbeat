import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";

import { useEvents } from "@/hooks/useLifeline";
import { formatEventDate, formatTime } from "@/lib/lifeline";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Safety history — Lifeline" },
      { name: "description", content: "Every check-in, missed check-in, alert and resolved emergency." },
      { property: "og:title", content: "Safety history — Lifeline" },
      { property: "og:description", content: "Your full Lifeline safety timeline." },
    ],
  }),
  component: HistoryPage,
});

const statusStyles: Record<string, string> = {
  ok: "bg-safe-soft text-safe",
  warning: "bg-warn-soft text-warn",
  critical: "bg-danger-soft text-danger",
  info: "bg-muted text-muted-foreground",
};

function HistoryPage() {
  const { data: events, isLoading } = useEvents();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Safety history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A record of every check-in, escalation and resolved emergency.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading history…</p>
      ) : events && events.length > 0 ? (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="panel flex flex-wrap items-start gap-3 p-4">
              <div className="numeric w-28 shrink-0 text-sm text-muted-foreground">
                <p>{formatEventDate(e.created_at)}</p>
                <p>{formatTime(e.created_at)}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{e.title}</p>
                {e.detail && <p className="text-sm text-muted-foreground">{e.detail}</p>}
                {e.latitude != null && (
                  <a
                    className="text-xs text-primary underline"
                    href={`https://www.openstreetmap.org/?mlat=${e.latitude}&mlon=${e.longitude}#map=17/${e.latitude}/${e.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open location
                  </a>
                )}
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                  statusStyles[e.status] ?? statusStyles["info"],
                )}
              >
                {e.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel p-8 text-center">
          <History className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Nothing recorded yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a safety check and your events will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
