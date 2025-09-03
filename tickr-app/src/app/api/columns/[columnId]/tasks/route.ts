// src/app/api/columns/[columnId]/tasks/route.ts
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

// GET /api/columns/:columnId/tasks → list all tasks in the column
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ columnId: string }> }
) {
  const { columnId } = await ctx.params
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const tasks = await prisma.task.findMany({
      where: { columnId },
      include: {
        subtasks: true, // include subtasks if you modeled them
        assignee: { select: { id: true, name: true, email: true } }, // if you linked to user
      },
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json(tasks)
  } catch (e) {
    console.error("GET /tasks error:", e)
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 })
  }
}

// POST /api/columns/:columnId/tasks → create a new task in this column
export async function POST(
  req: Request,
  ctx: { params: Promise<{ columnId: string }> }
) {
  const { columnId } = await ctx.params
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { title, subtitle, priority, dueDate, assigneeId, subtasks = [] } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const task = await prisma.task.create({
      data: {
        title,
        subtitle,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        columnId,
        assigneeId: assigneeId || null,
        subtasks: {
          create: subtasks.map((st: { title: string }) => ({ title: st.title })),
        },
      },
      include: { subtasks: true },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (e) {
    console.error("POST /tasks error:", e)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}
