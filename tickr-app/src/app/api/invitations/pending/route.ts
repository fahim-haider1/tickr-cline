// src/app/api/invitations/pending/route.ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

// Canonicalize email (Gmail: strip dots, drop +label, force @gmail.com)
function canon(email: string) {
  const e = email.trim().toLowerCase()
  const [localRaw, domainRaw = ""] = e.split("@")
  const domain = domainRaw.toLowerCase()
  let local = localRaw.toLowerCase()
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.split("+")[0].replace(/\./g, "")
    return `${local}@gmail.com`
  }
  return `${local}@${domain}`
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json([], { status: 200 })

  const emails = new Set<string>()

  // DB email
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (dbUser?.email) {
    emails.add(dbUser.email.toLowerCase())
    emails.add(canon(dbUser.email))
  }

  // Clerk emails (primary + all)
  const cu = await currentUser().catch(() => null)
  if (cu?.primaryEmailAddress?.emailAddress) {
    const e = cu.primaryEmailAddress.emailAddress
    emails.add(e.toLowerCase())
    emails.add(canon(e))
  }
  for (const ea of cu?.emailAddresses ?? []) {
    if (ea.emailAddress) {
      emails.add(ea.emailAddress.toLowerCase())
      emails.add(canon(ea.emailAddress))
    }
  }

  if (emails.size === 0) return NextResponse.json([], { status: 200 })

  const emailFilters = Array.from(emails).map((e) => ({
    email: { equals: e, mode: "insensitive" as const },
  }))

  const invites = await prisma.workspaceInvite.findMany({
    where: { status: "PENDING", OR: emailFilters },
    include: { workspace: { select: { id: true, name: true, isPersonal: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(invites, { status: 200 })
}
