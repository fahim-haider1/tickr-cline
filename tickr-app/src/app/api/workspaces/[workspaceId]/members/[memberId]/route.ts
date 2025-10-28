// src/app/api/workspaces/[workspaceId]/members/[memberId]/route.ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireWorkspaceAuth } from "@/lib/workspaceAuth"

export async function PUT(req: Request, context: { params: Promise<{ workspaceId: string; memberId: string }> }) {
  const { workspaceId, memberId } = await context.params

  const authz = await requireWorkspaceAuth(workspaceId, "ADMIN")
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status })
  }

  const body = await req.json().catch(() => ({} as any))
  const nextRole: "ADMIN" | "MEMBER" | "VIEWER" | undefined = body?.role
  if (!nextRole || !["ADMIN", "MEMBER", "VIEWER"].includes(nextRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  const member = await prisma.workspaceMember.findUnique({ where: { id: memberId } })
  if (!member || member.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 })
  }

  if (nextRole === "ADMIN" && member.role !== "ADMIN") {
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

  const updated = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role: nextRole },
    include: { user: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, context: { params: Promise<{ workspaceId: string; memberId: string }> }) {
  const { workspaceId, memberId } = await context.params

  const authz = await requireWorkspaceAuth(workspaceId, "ADMIN")
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status })
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    include: { user: true },
  })
  if (!member || member.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 })
  }

  await prisma.workspaceMember.delete({ where: { id: memberId } })
  return NextResponse.json({ success: true })
}
