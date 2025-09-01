import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Helper: ensure the workspace belongs to the current user
async function ensureOwned(workspaceId: string, userId: string) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } })
  if (!ws || ws.ownerId !== userId) return null
  return ws
}

// GET columns for a workspace (owned by user)
export async function GET(
  _req: Request,
  { params }: { params: { workspaceId: string } }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const ws = await ensureOwned(params.workspaceId, userId)
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const columns = await prisma.column.findMany({
    where: { workspaceId: params.workspaceId },
    orderBy: { order: "asc" },
    include: {
      tasks: {
        orderBy: { createdAt: "asc" },
        include: { subtasks: true },
      },
    },
  })
  return NextResponse.json(columns)
}

// CREATE column
export async function POST(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const ws = await ensureOwned(params.workspaceId, userId)
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 })
  }

  const max = await prisma.column.aggregate({
    where: { workspaceId: params.workspaceId },
    _max: { order: true },
  })
  const nextOrder = (max._max.order ?? -1) + 1

  const created = await prisma.column.create({
    data: {
      name: name.trim(),
      order: nextOrder,
      workspaceId: params.workspaceId,
    },
  })
  return NextResponse.json(created, { status: 201 })
}

// RENAME column
export async function PATCH(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const ws = await ensureOwned(params.workspaceId, userId)
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { columnId, name } = await req.json()
  if (!columnId || !name?.trim()) {
    return NextResponse.json({ error: "columnId and name required" }, { status: 400 })
  }

  const col = await prisma.column.findFirst({
    where: { id: columnId, workspaceId: params.workspaceId },
  })
  if (!col) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.column.update({
    where: { id: columnId }, // update by unique ID
    data: { name: name.trim() },
  })
  return NextResponse.json(updated)
}

// DELETE column
export async function DELETE(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const ws = await ensureOwned(params.workspaceId, userId)
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url = new URL(req.url)
  const columnId = url.searchParams.get("columnId")
  if (!columnId) {
    return NextResponse.json({ error: "columnId required" }, { status: 400 })
  }

  const col = await prisma.column.findFirst({
    where: { id: columnId, workspaceId: params.workspaceId },
  })
  if (!col) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.subtask.deleteMany({ where: { task: { columnId } } })
  await prisma.task.deleteMany({ where: { columnId } })
  await prisma.column.delete({ where: { id: columnId } }) // delete by unique ID

  return NextResponse.json({ ok: true })
}
