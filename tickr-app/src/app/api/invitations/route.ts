// src/app/api/invitations/route.ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json([], { status: 200 })

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })

    if (!me?.email) return NextResponse.json([], { status: 200 })

    const invites = await prisma.workspaceInvite.findMany({
      where: {
        email: { equals: me.email.toLowerCase(), mode: "insensitive" },
        status: "PENDING",
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        workspace: {
          select: { id: true, name: true, isPersonal: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(invites)
  } catch (err) {
    console.error("GET /api/invitations failed:", err)
    return NextResponse.json([], { status: 200 })
  }
}
