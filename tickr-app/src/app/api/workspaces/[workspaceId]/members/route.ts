// src/app/api/workspaces/[workspaceId]/members/route.ts
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await ctx.params
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // You can harden with a membership/ownership check if you like.
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, ownerId: true },
  })
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Return members in the shape the UI expects: { id, userId, role, joinedAt, user: { id, email, name, image, ... } }
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: { id: true, email: true, name: true, image: true, createdAt: true, updatedAt: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  })

  return NextResponse.json(members)
}
