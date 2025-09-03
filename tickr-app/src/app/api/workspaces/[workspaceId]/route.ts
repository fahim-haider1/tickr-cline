// src/app/api/workspaces/[workspaceId]/route.ts
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// PATCH /api/workspaces/:workspaceId
export async function PATCH(req: Request, context: any) {
  try {
    const { workspaceId } = context.params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!ws || ws.ownerId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const body = await req.json().catch(() => null)
    const name = body?.name
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 })
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name: name.trim() },
    })
    return NextResponse.json(updated)
  } catch (e) {
    console.error("PATCH /api/workspaces/[workspaceId] error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/workspaces/:workspaceId
export async function DELETE(_req: Request, context: any) {
  try {
    const { workspaceId } = context.params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { columns: true },
    })
    if (!ws || ws.ownerId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const columnIds = ws.columns.map((c) => c.id)

    await prisma.subtask.deleteMany({
      where: { task: { columnId: { in: columnIds } } },
    })
    await prisma.task.deleteMany({ where: { columnId: { in: columnIds } } })
    await prisma.column.deleteMany({ where: { workspaceId } })
    await prisma.workspace.delete({ where: { id: workspaceId } })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("DELETE /api/workspaces/[workspaceId] error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
