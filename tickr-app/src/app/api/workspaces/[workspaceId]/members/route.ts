// src/app/api/workspaces/[workspaceId]/members/route.ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireWorkspaceAuth } from "@/lib/workspaceAuth"
import { auth } from "@clerk/nextjs/server"

export async function GET(_req: Request, context: any) {
  const { workspaceId } = context.params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, ownerId: true },
  })
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: { id: true, email: true, name: true, image: true, createdAt: true, updatedAt: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  })

  return NextResponse.json(members)
}

export async function POST(req: Request, context: any) {
  const { workspaceId } = context.params

  const authz = await requireWorkspaceAuth(workspaceId, "ADMIN")
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status })
  }
  const inviterId = authz.me.id

  const body = await req.json().catch(() => ({} as any))
  const emailRaw: string = body?.email ?? ""
  const role: "ADMIN" | "MEMBER" | "VIEWER" = body?.role ?? "MEMBER"

  const email = emailRaw.trim().toLowerCase()
  if (!email || !["ADMIN", "MEMBER", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  if (role === "ADMIN") {
    const adminCount = await prisma.workspaceMember.count({
      where: { workspaceId, role: "ADMIN" },
    })
    if (adminCount >= 2) {
      return NextResponse.json(
        { error: "Maximum of 2 admins allowed in a workspace." },
        { status: 400 }
      )
    }
  }

  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, ownerId: true },
  })
  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 })

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existingUser?.id === ws.ownerId) {
    return NextResponse.json({ error: "Owner already has access" }, { status: 400 })
  }

  if (existingUser) {
    const existingMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: existingUser.id, workspaceId } },
      select: { id: true },
    })
    if (existingMember) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 })
    }
  }

  const existingPending = await prisma.workspaceInvite.findFirst({
    where: { workspaceId, email, status: "PENDING" },
    include: { workspace: { select: { id: true, name: true, isPersonal: true } } },
  })
  if (existingPending) {
    return NextResponse.json(existingPending, { status: 200 })
  }

  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId,
      email,
      role,
      invitedById: inviterId,
      status: "PENDING",
    },
    include: { workspace: { select: { id: true, name: true, isPersonal: true } } },
  })

  return NextResponse.json(invite, { status: 201 })
}
