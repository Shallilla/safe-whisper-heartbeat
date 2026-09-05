import { useCallback, useEffect, useState } from "react";

import type { Coords } from "@/lib/lifeline";

const STORAGE_KEY = "lifeline:last-location";

export type LocationStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported";

export function readLastLocation(): Coords | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Coords) : null;
  } catch {
    return null;
  }
}

function storeLocation(coords: Coords) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
  } catch {
    /* ignore */
  }
}

/** Best-effort place name. Fails silently — coordinates always remain the source of truth. */
async function describe(latitude: number, longitude: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=12`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { address?: Record<string, string> };
    const a = json.address ?? {};
    const city = a["city"] ?? a["town"] ?? a["village"] ?? a["county"] ?? a["state"];
    const country = a["country"];
    return [city, country].filter(Boolean).join(", ") || null;
  } catch {
    return null;
  }
}

export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCoords(readLastLocation());
    if (typeof navigator === "undefined" || !navigator.geolocation) setStatus("unsupported");
  }, []);

  const request = useCallback(async (): Promise<Coords | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      setError("This browser cannot provide a location.");
      return null;
    }
    setStatus("requesting");
    setError(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const base: Coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date().toISOString(),
          };
          const label = await describe(base.latitude, base.longitude);
          const next = { ...base, label };
          storeLocation(next);
          setCoords(next);
          setStatus("granted");
          resolve(next);
        },
        (err) => {
          setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "idle");
          setError(
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied. Lifeline cannot share an accurate location, but everything else keeps working."
              : "Lifeline could not read your location right now.",
          );
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
      );
    });
  }, []);

  return { coords, status, error, request };
}
