// src/app/api/columns/[columnId]/tasks/route.ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: { columnId: string } }
) {
  try {
    const { columnId } = params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const {
      title,
      subtitle,   // 👈 incoming field, will map to description
      details,
      priority,
      dueDate,
      assigneeId,
      subtasks,
    } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // 👇 Calculate next "order" for this column
    const maxOrder = await prisma.task.aggregate({
      where: { columnId },
      _max: { order: true },
    })
    const nextOrder = (maxOrder._max.order ?? 0) + 1

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: subtitle || null, // map subtitle → description
        details: details || null,
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        order: nextOrder,
        columnId,
        assigneeId: assigneeId || null,
        subtasks: {
          create:
            subtasks?.map((st: any, idx: number) => ({
              title: st,
              order: idx,
            })) || [],
        },
      },
      include: {
        subtasks: true,
        assignee: { select: { id: true, name: true, email: true, image: true } },
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (err) {
    console.error("POST /api/columns/[columnId]/tasks error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
