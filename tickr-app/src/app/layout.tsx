// src/app/layout.tsx

import type { Metadata } from 'next'
import { Outfit, Fira_Code } from 'next/font/google'
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from '@clerk/nextjs'
import { UserSync } from '@/components/UserSync'
import { ClientLayout } from './ClientLayout'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], display: 'swap', variable: '--font-outfit' })
const firaCode = Fira_Code({ subsets: ['latin'], display: 'swap', variable: '--font-fira-code' })

export const metadata: Metadata = {
  title: 'Tickr - Kanban Task Manager',
  description: 'A modern kanban-style task management application with workspaces and team collaboration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`font-sans antialiased ${outfit.variable} ${firaCode.variable}`}>
          {/* UserSync must be rendered unconditionally inside ClerkProvider */}
          <UserSync />
          
          {/* Public content for signed out users */}
          <SignedOut>
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-14 items-center">
                <div className="mr-4 flex">
                  <span className="font-bold text-primary">✓ Tickr</span>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-2">
                  <SignInButton mode="modal">
                    <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4">
                      Sign Up
                    </button>
                  </SignUpButton>
                </div>
              </div>
            </header>
            {children}
          </SignedOut>

          {/* Protected content for signed in users */}
          <SignedIn>
            <ClientLayout>{children}</ClientLayout>
          </SignedIn>
        </body>
      </html>
    </ClerkProvider>
  )
}
