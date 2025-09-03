// src/app/api/workspaces/[workspaceId]/members/route.ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { requireWorkspaceAuth } from "@/lib/workspaceAuth"

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

export async function GET(
  _req: NextRequest,
  context: { params: { workspaceId: string } }
) {
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
        select: { id: true, email: true, name: true, image: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  })

  return NextResponse.json(members)
}

export async function POST(
  req: NextRequest,
  context: { params: { workspaceId: string } }
) {
  const { workspaceId } = context.params
  const authz = await requireWorkspaceAuth(workspaceId, "ADMIN")
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status })
  }
  const inviterId = authz.me.id

  const body = await req.json()
  const emailRaw: string = body?.email ?? ""
  const role: "ADMIN" | "MEMBER" | "VIEWER" = body?.role ?? "MEMBER"

  const emailLower = emailRaw.trim().toLowerCase()
  if (!emailLower || !["ADMIN", "MEMBER", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }
  const emailNorm = canon(emailLower)

  if (role === "ADMIN") {
    const adminCount = await prisma.workspaceMember.count({
      where: { workspaceId, role: "ADMIN" },
    })
    if (adminCount >= 2) {
      return NextResponse.json(
        { error: "Maximum of 2 admins allowed." },
        { status: 400 }
      )
    }
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: emailLower, mode: "insensitive" } },
        { email: { equals: emailNorm, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  })

  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, ownerId: true },
  })
  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 })

  if (existingUser?.id === ws.ownerId) {
    return NextResponse.json({ error: "Owner already has access" }, { status: 400 })
  }

  if (existingUser) {
    const existingMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: existingUser.id, workspaceId } },
    })
    if (existingMember) {
      return NextResponse.json({ error: "User already a member" }, { status: 409 })
    }
  }

  const existingPending = await prisma.workspaceInvite.findFirst({
    where: {
      workspaceId,
      status: "PENDING",
      OR: [
        { email: { equals: emailLower, mode: "insensitive" } },
        { email: { equals: emailNorm, mode: "insensitive" } },
      ],
    },
    include: { workspace: { select: { id: true, name: true } } },
  })
  if (existingPending) return NextResponse.json(existingPending, { status: 200 })

  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId,
      email: emailNorm,
      role,
      invitedById: inviterId,
      status: "PENDING",
    },
    include: { workspace: { select: { id: true, name: true } } },
  })

  return NextResponse.json(invite, { status: 201 })
}
