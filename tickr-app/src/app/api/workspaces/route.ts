import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import prisma from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET: return only the current user's workspaces
export async function GET() {
  const { userId } = auth()
  if (!userId) return NextResponse.json([], { status: 200 })

  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(workspaces)
}

// POST: create a workspace for the current user
export async function POST(req: Request) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name } = await req.json()

  const ws = await prisma.workspace.create({
    data: {
      name,
      ownerId: userId,
    },
  })

  return NextResponse.json(ws, { status: 201 })
}
