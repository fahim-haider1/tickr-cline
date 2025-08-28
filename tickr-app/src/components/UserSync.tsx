// src/components/UserSync.tsx
'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';

export function UserSync() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      console.log('Syncing user with database...');
      
      // Sync user with our database
      fetch('/api/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(response => response.json())
      .then(data => {
        console.log('User sync result:', data);
      })
      .catch(error => {
        console.error('Failed to sync user:', error);
      });
    }
  }, [isLoaded, user]);

  return null; // This component doesn't render anything
}