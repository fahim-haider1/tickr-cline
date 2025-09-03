// src/app/api/columns/[columnId]/tasks/route.ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

// Create a new task in a column
export async function POST(
  req: NextRequest,
  context: { params: { columnId: string } }
) {
  try {
    const { columnId } = context.params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { title, description, priority, dueDate, assigneeId, subtasks = [] } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title required" }, { status: 400 })
    }

    // Find the last task to set correct order
    const lastTask = await prisma.task.findFirst({
      where: { columnId },
      orderBy: { order: "desc" },
    })
    const order = lastTask ? lastTask.order + 1 : 1

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description || null,
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        columnId,
        assigneeId: assigneeId || null,
        order,
        subtasks: {
          create: subtasks.map((st: any, idx: number) => ({
            title: st.title,
            order: idx + 1,
          })),
        },
      },
      include: { subtasks: true },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (e) {
    console.error("POST /api/columns/[columnId]/tasks error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
