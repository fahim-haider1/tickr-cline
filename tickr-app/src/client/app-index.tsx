// src/client/app-index.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppRouter from './components/app-router'; // keep same path your app expects
import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';

/**
 * Minimal client app entry. All hooks are declared unconditionally.
 * Keeps things simple so hook-order bugs are easier to isolate.
 */

export default function ClientAppIndex({ children }: { children: ReactNode }) {
  // All hooks declared at top
  const [ready, setReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Memo example (never conditionally called)
  const readyMemo = useMemo(() => ({ r: ready }), [ready]);

  // Hydration effect
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Another effect to simulate initialization
  useEffect(() => {
    if (!hydrated) return;
    // small timeout to allow any client-init work
    const t = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(t);
  }, [hydrated]);

  if (!hydrated) {
    // simple placeholder until client has hydrated
    return <div className="h-full w-full" />;
  }

  return (
    <ClerkProvider>
      <AppRouter>
        {ready ? children : <div className="h-full w-full" />}
      </AppRouter>
    </ClerkProvider>
  );
}
