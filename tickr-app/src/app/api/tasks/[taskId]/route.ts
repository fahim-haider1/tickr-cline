// src/app/api/tasks/[taskId]/route.ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

// Helper: ensure current user can access the task's workspace (owner/admin/member)
async function canAccessTask(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      column: {
        select: {
          workspace: {
            select: {
              ownerId: true,
              members: { select: { userId: true, role: true } },
            },
          },
        },
      },
    },
  })
  if (!task) return { ok: false, status: 404, error: "Task not found" as const }

  const ws = task.column.workspace
  const isMember =
    ws.ownerId === userId ||
    ws.members.some((m) => m.userId === userId) // allow any member

  if (!isMember) return { ok: false, status: 403, error: "No access to this workspace" as const }
  return { ok: true as const }
}

// GET /api/tasks/[taskId]
export async function GET(_req: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await ctx.params // ✅ fix: await params
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const access = await canAccessTask(userId, taskId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        subtasks: true,
        assignee: { select: { id: true, name: true, email: true, image: true } },
      },
    })
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })
    return NextResponse.json(task)
  } catch (e) {
    console.error("GET task error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/tasks/[taskId]
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await ctx.params // ✅ fix: await params
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const access = await canAccessTask(userId, taskId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await req.json().catch(() => ({} as any))
    const data: any = {}

    if (typeof body.title === "string") data.title = body.title.trim()
    if (body.description !== undefined) data.description = body.description ?? null
    if (body.details !== undefined) data.details = body.details ?? null
    if (typeof body.priority === "string") {
      const up = String(body.priority).toUpperCase()
      if (["LOW", "MEDIUM", "HIGH"].includes(up)) data.priority = up
    }
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null
    if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId ? String(body.assigneeId) : null

    const updated = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        subtasks: true,
        assignee: { select: { id: true, name: true, email: true, image: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error("PATCH task error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/tasks/[taskId]
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await ctx.params // ✅ fix: await params
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const access = await canAccessTask(userId, taskId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    await prisma.task.delete({ where: { id: taskId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("DELETE task error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
