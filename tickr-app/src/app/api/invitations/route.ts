// src/app/api/invitations/route.ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (!me?.email) return NextResponse.json([], { status: 200 })

  const invites = await prisma.workspaceInvite.findMany({
    where: { email: me.email.toLowerCase(), status: "PENDING" },
    select: {
      id: true,
      role: true,
      createdAt: true,
      workspace: { select: { id: true, name: true, isPersonal: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(invites)
}
