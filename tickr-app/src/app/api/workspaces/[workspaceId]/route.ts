import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function PATCH(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ws = await prisma.workspace.findUnique({ where: { id: params.workspaceId } })
  if (!ws || ws.ownerId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 })
  }

  const updated = await prisma.workspace.update({
    where: { id: params.workspaceId },
    data: { name: name.trim() },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: { workspaceId: string } }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ws = await prisma.workspace.findUnique({
    where: { id: params.workspaceId },
    include: { columns: true },
  })
  if (!ws || ws.ownerId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const columnIds = ws.columns.map(c => c.id)
  await prisma.subtask.deleteMany({ where: { task: { columnId: { in: columnIds } } } })
  await prisma.task.deleteMany({ where: { columnId: { in: columnIds } } })
  await prisma.column.deleteMany({ where: { workspaceId: params.workspaceId } })
  await prisma.workspace.delete({ where: { id: params.workspaceId } })

  return NextResponse.json({ ok: true })
}
