import type React from "react"
import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import { Fira_Code } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
})

const firaCode = Fira_Code({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Tickr - Project Management",
  description: "Modern Kanban board for project management",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`font-sans ${outfit.variable} ${firaCode.variable} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
