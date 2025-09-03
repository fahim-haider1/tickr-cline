// src/app/api/columns/[columnId]/tasks/route.ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, context: any) {
  try {
    const { columnId } = context.params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { title, description, priority, dueDate, assigneeId, subtasks } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title required" }, { status: 400 })
    }

    const count = await prisma.task.count({ where: { columnId } })

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description ?? null,
        priority: priority ?? "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        columnId,
        assigneeId: assigneeId ?? null,
        order: count,
        subtasks: {
          create: (subtasks ?? []).map((s: any, idx: number) => ({
            title: s.title,
            order: idx,
          })),
        },
      },
      include: { subtasks: true },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (err) {
    console.error("POST /api/columns/[columnId]/tasks error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
