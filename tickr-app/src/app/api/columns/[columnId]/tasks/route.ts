// src/app/api/columns/[columnId]/tasks/route.ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, context: any) {
  try {
    const { columnId } = context.params
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({} as any))
    const {
      title,
      description,
      priority = "MEDIUM",
      dueDate,
      assigneeId = null,
      subtasks = [],
    } = body || {}

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title required" }, { status: 400 })
    }

    // compute order at end of column
    const nextOrder = await prisma.task.count({ where: { columnId } })

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description ?? null,         // matches schema (subtitle was removed)
        priority,                                 // TaskPriority enum
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId,
        columnId,
        order: nextOrder,                         // REQUIRED in schema
        subtasks: {
          create: (Array.isArray(subtasks) ? subtasks : []).map((s: any, idx: number) => ({
            title: String(s?.title ?? "").trim() || `Subtask ${idx + 1}`,
            order: idx,
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
