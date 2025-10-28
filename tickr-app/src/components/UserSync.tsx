"use client";

import { useEffect } from "react";

/**
 * Minimal, safe UserSync component.
 * It pings a server endpoint to ensure the authenticated user
 * exists in your DB. Fails silently if the route doesn't exist.
 */
export default function UserSync() {
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        // Use the app's sync endpoint only to avoid 404 noise in dev logs
        const res = await fetch("/api/sync-user", { method: "POST", credentials: "include" }).catch(() => null);
        if (ignore) return;
        // no-op; endpoint is best-effort
      } catch {
        // ignore errors
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  return null;
}
