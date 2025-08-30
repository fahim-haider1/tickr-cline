// src/components/app-router.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter as useNextRouter, useSearchParams } from 'next/navigation';

/**
 * A minimal, hook-safe Router component.
 *
 * This file intentionally avoids calling hooks conditionally.
 * If your previous Router implemented more features (layouts, guards, analytics),
 * re-introduce them but keep hooks always at the top of the component.
 */

export default function RouterWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  // ---- ALL HOOKS DECLARED UNCONDITIONALLY AT TOP ----
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextRouter = useNextRouter();

  // local UI state example — declared unconditionally
  const [ready, setReady] = useState<boolean>(false);
  const [locationKey, setLocationKey] = useState<string | null>(null);

  // memoized derived value — useMemo is fine as long as it is never conditionally called
  const memoizedLocation = useMemo(() => {
    // compute a stable string representing the location
    const sp = searchParams?.toString() ?? '';
    return `${pathname ?? '/'}${sp ? `?${sp}` : ''}`;
  }, [pathname, searchParams]);

  // Keep an effect that updates local state when location changes.
  useEffect(() => {
    // This effect runs whenever the memoizedLocation changes
    setLocationKey(memoizedLocation);
    // small delay to simulate ready state transition — optional
    setReady(true);
  }, [memoizedLocation]);

  // Example: if you need to guard routes, do it here but don't call hooks inside guards.
  // For example, redirect logic using nextRouter.push should be inside effects (not during render).
  useEffect(() => {
    // Example guard (customize as needed):
    // if (!ready) return; // allowed because it's inside effect
    // if (memoizedLocation === '/forbidden') nextRouter.push('/login');
  }, [memoizedLocation, nextRouter, ready]);

  // ----- Render -----
  // We can show a small loading placeholder while "ready" becomes true,
  // but we DO NOT early-return before hooks (hooks are already declared).
  if (!ready) {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        {/* lightweight placeholder */}
        <div className="flex items-center justify-center h-full p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  // Normal render: render children (app content)
  return <>{children}</>;
}
