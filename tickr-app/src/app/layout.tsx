import type React from "react"
import type { Metadata } from "next"
import { Molengo, Kalam, Fira_Code } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"

const molengo = Molengo({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
})

const kalam = Kalam({
  weight: ["300", "400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
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
        <body className={`font-sans ${molengo.variable} ${kalam.variable} ${firaCode.variable} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
