// src/app/api/tasks/move/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// POST /api/tasks/move
// body: { taskId: string, toColumnId: string, toIndex: number }
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await req.json().catch(() => null)) as {
      taskId?: string
      toColumnId?: string
      toIndex?: number
    } | null

    const taskId = (body?.taskId ?? "").toString().trim()
    const toColumnId = (body?.toColumnId ?? "").toString().trim()
    let toIndex = Number.isFinite(body?.toIndex) ? Number(body!.toIndex) : 0

    if (!taskId || !toColumnId) {
      return NextResponse.json({ error: "Missing taskId/toColumnId" }, { status: 400 })
    }

    // Load the task with its column + workspace for access checks
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: {
          select: {
            id: true,
            workspace: {
              select: { id: true, ownerId: true, members: { select: { userId: true, role: true } } }
            }
          }
        }
      }
    })

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })

    const workspace = task.column.workspace
    const me =
      workspace.ownerId === userId
        ? { role: "ADMIN" as const }
        : workspace.members.find(m => m.userId === userId) || null

    if (!me) {
      return NextResponse.json({ error: "No access to this workspace" }, { status: 403 })
    }
    // 🔒 Viewers cannot move tasks
    if (me.role === "VIEWER") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Ensure destination column belongs to the same workspace (also need its name)
    const destColumn = await prisma.column.findUnique({
      where: { id: toColumnId },
      select: { id: true, name: true, workspace: { select: { id: true } } }
    })
    if (!destColumn) return NextResponse.json({ error: "Destination column not found" }, { status: 404 })
    if (destColumn.workspace.id !== workspace.id) {
      return NextResponse.json({ error: "Cannot move task across workspaces" }, { status: 400 })
    }

    const fromColumnId = task.columnId
    const movingWithinSame = fromColumnId === toColumnId

    if (movingWithinSame) {
      // Reorder within the same column
      const ids = await prisma.task.findMany({
        where: { columnId: fromColumnId },
        orderBy: { order: "asc" },
        select: { id: true }
      })
      const list = ids.map(i => i.id)

      const fromIndex = list.indexOf(taskId)
      if (fromIndex === -1) return NextResponse.json({ error: "Task missing in source column" }, { status: 404 })

      // clamp
      if (toIndex < 0) toIndex = 0
      if (toIndex > list.length - 1) toIndex = list.length - 1

      list.splice(fromIndex, 1)
      list.splice(toIndex, 0, taskId)

      await prisma.$transaction(
        list.map((id, idx) =>
          prisma.task.update({ where: { id }, data: { order: idx } })
        )
      )

      return NextResponse.json({ ok: true })
    }

    // Moving across columns
    const sourceIds = await prisma.task.findMany({
      where: { columnId: fromColumnId },
      orderBy: { order: "asc" },
      select: { id: true }
    })
    const destIds = await prisma.task.findMany({
      where: { columnId: toColumnId },
      orderBy: { order: "asc" },
      select: { id: true }
    })

    const sourceList = sourceIds.map(i => i.id)
    const destList = destIds.map(i => i.id)

    const fromIndex = sourceList.indexOf(taskId)
    if (fromIndex === -1) return NextResponse.json({ error: "Task missing in source column" }, { status: 404 })

    sourceList.splice(fromIndex, 1)
    if (toIndex < 0) toIndex = 0
    if (toIndex > destList.length) toIndex = destList.length
    destList.splice(toIndex, 0, taskId)

    // Build transaction ops
    const ops = [
      // Move task to new column first
      prisma.task.update({
        where: { id: taskId },
        data: { columnId: toColumnId }
      }),
      // Re-index source column
      ...sourceList.map((id, idx) =>
        prisma.task.update({ where: { id }, data: { order: idx } })
      ),
      // Re-index dest column
      ...destList.map((id, idx) =>
        prisma.task.update({ where: { id }, data: { order: idx } })
      ),
    ]

    // ✅ If destination is "Done", mark all subtasks complete (server truth)
    if (destColumn.name.toLowerCase() === "done") {
      ops.push(
        prisma.subtask.updateMany({
          where: { taskId },
          data: { completed: true },
        })
      )
    }

    await prisma.$transaction(ops)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("Task move error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
