// src/app/api/tasks/[taskId]/route.ts
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// DELETE /api/tasks/:taskId
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ taskId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { taskId } = await ctx.params

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: {
          include: {
            workspace: { include: { members: true } },
            tasks: { select: { id: true, order: true } },
          },
        },
      },
    })
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const ws = task.column.workspace
    const can =
      ws.ownerId === userId ||
      ws.members.some((m) => m.userId === userId && (m.role === "ADMIN" || m.role === "MEMBER"))
    if (!can) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const colId = task.columnId

    await prisma.$transaction(async (tx) => {
      // Delete task (subtasks cascade via schema)
      await tx.task.delete({ where: { id: taskId } })

      // Reindex remaining tasks in the column to keep order compact
      const remaining = await tx.task.findMany({
        where: { columnId: colId },
        orderBy: { order: "asc" },
        select: { id: true },
      })
      await Promise.all(
        remaining.map((t, idx) => tx.task.update({ where: { id: t.id }, data: { order: idx } }))
      )
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("DELETE /api/tasks/[taskId] error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
