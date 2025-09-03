// src/app/api/subtasks/[subtaskId]/route.ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { subtaskId: string } }
) {
  try {
    const { subtaskId } = params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const completed: boolean | undefined = body?.completed
    if (typeof completed !== "boolean") {
      return NextResponse.json({ error: "completed must be boolean" }, { status: 400 })
    }

    const sub = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      select: {
        task: {
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
        },
      },
    })

    if (!sub) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const ws = sub.task.column.workspace
    const me =
      ws.ownerId === userId
        ? { role: "ADMIN" as const }
        : ws.members.find((m) => m.userId === userId) || null

    if (!me) {
      return NextResponse.json({ error: "No access" }, { status: 403 })
    }

    if (me.role === "VIEWER") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const updated = await prisma.subtask.update({
      where: { id: subtaskId },
      data: { completed },
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error("PATCH subtask error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
