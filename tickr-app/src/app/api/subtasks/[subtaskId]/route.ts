// src/app/api/subtasks/[subtaskId]/route.ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ subtaskId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { subtaskId } = await ctx.params
    const body = await req.json()
    const completed: boolean | undefined =
      typeof body?.completed === "boolean" ? body.completed : undefined

    if (typeof completed === "undefined") {
      return NextResponse.json({ error: "completed (boolean) required" }, { status: 400 })
    }

    // access check: user must be owner or ADMIN/MEMBER of the workspace that owns this subtask's task
    const sub = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: { task: { include: { column: { include: { workspace: { include: { members: true } } } } } } },
    })
    if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const ws = sub.task.column.workspace
    const can =
      ws.ownerId === userId ||
      ws.members.some((m) => m.userId === userId && (m.role === "ADMIN" || m.role === "MEMBER"))

    if (!can) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const updated = await prisma.subtask.update({
      where: { id: subtaskId },
      data: { completed },
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error("PATCH /api/subtasks/[subtaskId] error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
