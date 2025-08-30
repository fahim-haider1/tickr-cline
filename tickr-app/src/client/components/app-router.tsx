// src/client/components/app-router.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter as useNextRouter, useSearchParams } from 'next/navigation';

export default function RouterWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextRouter = useNextRouter();

  const [ready, setReady] = useState<boolean>(false);
  const [locationKey, setLocationKey] = useState<string | null>(null);

  const memoizedLocation = useMemo(() => {
    const sp = searchParams?.toString() ?? '';
    return `${pathname ?? '/'}${sp ? `?${sp}` : ''}`;
  }, [pathname, searchParams]);

  useEffect(() => {
    setLocationKey(memoizedLocation);
    setReady(true);
  }, [memoizedLocation]);

  useEffect(() => {
    // keep routing side-effects here (optional)
  }, [memoizedLocation, nextRouter, ready]);

  if (!ready) {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <div className="flex items-center justify-center h-full p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
