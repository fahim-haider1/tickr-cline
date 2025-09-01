import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/workspaces/[id]/columns - list columns (and seed Todo/Done if missing)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = getAuth(req as any)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = params.id

  // Ensure the user has access (owner or member)
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  })
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found or no access" }, { status: 404 })
  }

  // If no columns yet, seed Todo/Done
  const count = await prisma.column.count({ where: { workspaceId } })
  if (count === 0) {
    await prisma.$transaction([
      prisma.column.create({
        data: { name: "Todo", order: 0, workspaceId },
      }),
      prisma.column.create({
        data: { name: "Done", order: 1, workspaceId },
      }),
    ])
  }

  const columns = await prisma.column.findMany({
    where: { workspaceId },
    orderBy: { order: "asc" },
    include: {
      tasks: {
        orderBy: { order: "asc" },
        include: {
          subtasks: { orderBy: { order: "asc" } },
          assignee: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  })

  return NextResponse.json(columns)
}

// POST /api/workspaces/[id]/columns - create a new column
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = getAuth(req as any)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaceId = params.id
  const body = await req.json()
  const name = (body?.name ?? "").toString().trim()
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  // Ensure the user has access (owner or member)
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  })
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found or no access" }, { status: 404 })
  }

  const maxOrder = await prisma.column.aggregate({
    where: { workspaceId },
    _max: { order: true },
  })

  const newCol = await prisma.column.create({
    data: {
      name,
      workspaceId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  })

  return NextResponse.json(newCol, { status: 201 })
}
