// src/app/api/tasks/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/tasks
 * Body: { columnId: string, title: string, description?, priority?: "LOW"|"MEDIUM"|"HIGH", dueDate?, assigneeId? }
 * Creates a task at the end of the given column (order = last + 1).
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const columnId = String(body?.columnId || "");
    const title = String(body?.title || "").trim();
    const description = body?.description ? String(body.description) : null;
    const rawPriority = String(body?.priority || "MEDIUM").toUpperCase();
    const priority = rawPriority === "LOW" || rawPriority === "HIGH" ? rawPriority : "MEDIUM";
    const assigneeId = body?.assigneeId ? String(body.assigneeId) : null;
    const dueDate = body?.dueDate ? new Date(body.dueDate) : null;

    if (!columnId || !title) {
      return NextResponse.json({ error: "columnId and title are required" }, { status: 400 });
    }

    // Check access: owner or ADMIN/MEMBER in the workspace that owns the column
    const workspace = await prisma.workspace.findFirst({
      where: {
        columns: { some: { id: columnId } },
        OR: [
          { ownerId: userId },
          { members: { some: { userId, role: { in: ["ADMIN", "MEMBER"] } } } },
        ],
      },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "No access to this workspace" }, { status: 403 });
    }

    const maxOrder = await prisma.task.aggregate({
      where: { columnId },
      _max: { order: true },
    });

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,                // Prisma enum: LOW | MEDIUM | HIGH
        order: (maxOrder._max.order ?? -1) + 1,
        dueDate,
        assigneeId,
        columnId,
      },
      include: {
        subtasks: true,
        assignee: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("Create task error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
