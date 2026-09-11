import { ExternalLink, MapPin, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { coordsLabel, mapsUrl } from "@/lib/lifeline";

export function MiniMap({
  latitude,
  longitude,
}: {
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
}) {
  if (latitude == null || longitude == null) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted text-sm text-muted-foreground">
        No location available
      </div>
    );
  }
  const d = 0.01;
  const bbox = `${longitude - d},${latitude - d},${longitude + d},${latitude + d}`;
  return (
    <iframe
      title="Last known location"
      className="h-40 w-full rounded-lg border border-border"
      loading="lazy"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`}
    />
  );
}

export function LocationPanel({
  latitude,
  longitude,
  label,
  capturedAt,
  onRefresh,
  refreshing,
  note,
}: {
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  label?: string | null | undefined;
  capturedAt?: string | null | undefined;
  onRefresh?: () => void | undefined;
  refreshing?: boolean | undefined;
  note?: string | null | undefined;
}) {
  const url = mapsUrl(latitude, longitude);
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">{coordsLabel(latitude, longitude, label)}</p>
            {latitude != null && longitude != null && (
              <p className="numeric text-xs text-muted-foreground">
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
                {capturedAt ? ` · ${new Date(capturedAt).toLocaleTimeString()}` : ""}
              </p>
            )}
          </div>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
            Update
          </Button>
        )}
      </div>
      <MiniMap latitude={latitude} longitude={longitude} />
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      {url && (
        <Button asChild variant="secondary" size="sm" className="w-full">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" />
            Open location
          </a>
        </Button>
      )}
    </div>
  );
}
