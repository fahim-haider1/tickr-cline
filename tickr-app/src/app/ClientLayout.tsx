// src/app/ClientLayout.tsx
'use client';

import { UserButton } from '@clerk/nextjs';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <span className="font-bold text-primary">✓ Tickr</span>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <UserButton />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
