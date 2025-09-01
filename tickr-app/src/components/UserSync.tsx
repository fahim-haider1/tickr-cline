// src/components/UserSync.tsx
'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';

export default function UserSync() {
  const { user, isLoaded } = useUser();
  const syncedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoaded || !user) return;
    if (syncedRef.current.has(user.id)) return;

    console.log('Syncing user with database...', user.id);
    syncedRef.current.add(user.id);

    (async () => {
      try {
        const res = await fetch('/api/sync-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',   // ensure Clerk cookies go with the request
          cache: 'no-store',
        });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(`Sync failed: ${res.status} ${t}`);
        }
        console.log('User sync successful:', user.id);
      } catch (err) {
        console.error('Failed to sync user:', err);
        // allow retry next render
        syncedRef.current.delete(user.id);
      }
    })();
  }, [isLoaded, user]);

  return null;
}
