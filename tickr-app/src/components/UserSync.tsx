// src/components/UserSync.tsx

'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';

export function UserSync() {
  const { user, isLoaded } = useUser();
  const syncedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isLoaded && user && !syncedRef.current.has(user.id)) {
      console.log('Syncing user with database...', user.id);
      
      // Mark this user as being synced to prevent duplicate calls
      syncedRef.current.add(user.id);
      
      // Sync user with our database
      fetch('/api/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Sync failed: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log('User sync successful:', user.id);
        })
        .catch(error => {
          console.error('Failed to sync user:', error);
          // Remove from synced set if sync failed, so it can be retried
          syncedRef.current.delete(user.id);
        });
    }
  }, [isLoaded, user]);

  return null; // This component doesn't render anything
}
