import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET: return only the current user's workspaces
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json([], { status: 200 })

  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(workspaces)
}

// POST: create a workspace for the current user (+ seed Todo/Done)
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description } = await req.json()

  const ws = await prisma.workspace.create({
    data: {
      name,
      description: description ?? null,
      ownerId: userId,
      // owner is an admin member
      members: {
        create: { userId, role: "ADMIN" },
      },
      // seed columns: Todo, Done
      columns: {
        create: [
          { name: "Todo", order: 0 },
          { name: "Done", order: 1 },
        ],
      },
    },
  })

  return NextResponse.json(ws, { status: 201 })
}
