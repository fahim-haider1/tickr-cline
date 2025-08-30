// src/app/ClientLayout.tsx
'use client';

import { UserButton } from '@clerk/nextjs';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header
        className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        style={{ marginLeft: 'var(--primary-sidebar-offset, 0px)' }}
      >
        <div className="flex h-14 items-center px-4">
          <div className="mr-4 flex">
            <span className="font-bold text-primary">Tickr</span>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <UserButton />
          </div>
        </div>
      </header>
      {/* Let pages control their own width/offset; no container here */}
      <main className="px-0 py-0">{children}</main>
    </div>
  );
}

