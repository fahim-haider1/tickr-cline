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
        // Try common sync endpoints; adjust to your backend route.
        // Prefer one; others are fallbacks.
        const endpoints = ["/api/user/sync", "/api/users/sync", "/api/sync-user"];
        for (const url of endpoints) {
          const res = await fetch(url, { method: "POST", credentials: "include" }).catch(() => null);
          if (ignore) return;
          if (res && (res.ok || res.status === 405)) break; // 405 if route expects GET, we stop anyway
        }
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
