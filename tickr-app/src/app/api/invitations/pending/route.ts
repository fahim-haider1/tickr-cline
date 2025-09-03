// src/app/api/invitations/pending/route.ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  // must be signed in to have invites
  const { userId } = await auth()
  if (!userId) return NextResponse.json([], { status: 200 })

  // gather all known emails for this user (DB + Clerk), lowercased & unique
  const emails = new Set<string>()

  // DB email (from your users table)
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (dbUser?.email) emails.add(dbUser.email.toLowerCase())

  // Clerk emails (primary + all)
  const cu = await currentUser().catch(() => null)
  const primary = cu?.primaryEmailAddress?.emailAddress
  if (primary) emails.add(primary.toLowerCase())
  for (const ea of cu?.emailAddresses ?? []) {
    if (ea.emailAddress) emails.add(ea.emailAddress.toLowerCase())
  }

  if (emails.size === 0) {
    // nothing to match against
    return NextResponse.json([], { status: 200 })
  }

  // Build an OR filter with case-insensitive equality for each email
  const emailFilters = Array.from(emails).map((e) => ({
    email: { equals: e, mode: "insensitive" as const },
  }))

  const invites = await prisma.workspaceInvite.findMany({
    where: {
      status: "PENDING",
      OR: emailFilters,
    },
    include: {
      workspace: { select: { id: true, name: true, isPersonal: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // return as-is; your UI can read id/role/createdAt/workspace
  return NextResponse.json(invites, { status: 200 })
}
