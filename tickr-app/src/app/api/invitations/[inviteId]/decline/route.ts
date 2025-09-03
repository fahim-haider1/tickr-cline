// src/app/api/invitations/[inviteId]/decline/route.ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

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

export async function POST(_req: Request, context: any) {
  try {
    const { inviteId } = context.params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Collect all possible user emails
    const emails = new Set<string>()
    const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (dbUser?.email) {
      emails.add(dbUser.email.toLowerCase())
      emails.add(canon(dbUser.email))
    }

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

    if (emails.size === 0) {
      return NextResponse.json({ error: "No email on file" }, { status: 400 })
    }

    const invite = await prisma.workspaceInvite.findUnique({ where: { id: inviteId } })
    if (!invite || invite.status !== "PENDING") {
      return NextResponse.json({ error: "Invite not found or not pending" }, { status: 404 })
    }

    const target = invite.email.toLowerCase()
    if (![target, canon(target)].some((t) => emails.has(t))) {
      return NextResponse.json({ error: "This invite is not for your email" }, { status: 403 })
    }

    await prisma.workspaceInvite.update({
      where: { id: inviteId },
      data: { status: "DECLINED" },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("POST /api/invitations/[inviteId]/decline error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
