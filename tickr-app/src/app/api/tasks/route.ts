// src/app/api/tasks/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type CreateTaskBody = {
  columnId: string;
  title: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string | null;
  assigneeId?: string | null;
  subtasks?: string[]; // list of subtask titles
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Partial<CreateTaskBody>;
    const columnId = String(body.columnId || "");
    const rawTitle = typeof body.title === "string" ? body.title : "";
    const title = rawTitle.trim();
    const dueDate = body.dueDate ? new Date(body.dueDate) : null;
    const assigneeId = body.assigneeId || null;
    const subtasks = Array.isArray(body.subtasks) ? body.subtasks : [];

    if (!columnId || !title) {
      return NextResponse.json({ error: "columnId and title are required" }, { status: 400 });
    }

    // Auth: user must belong to the column's workspace (VIEWERs cannot create)
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      select: {
        id: true,
        workspace: {
          select: {
            ownerId: true,
            members: { select: { userId: true, role: true } },
          },
        },
      },
    });
    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    const ws = column.workspace;
    const me =
      ws.ownerId === userId
        ? { role: "ADMIN" as const }
        : ws.members.find((m) => m.userId === userId) || null;

    if (!me) {
      return NextResponse.json({ error: "No access" }, { status: 403 });
    }
    if (me.role === "VIEWER") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Compute next order inside this column
    const nextOrder = await prisma.task.count({ where: { columnId } });

    const allowedPriorities = new Set(["LOW", "MEDIUM", "HIGH"]);
    const priority = allowedPriorities.has(String(body.priority))
      ? (body.priority as "LOW" | "MEDIUM" | "HIGH")
      : "MEDIUM";

    const created = await prisma.task.create({
      data: {
        columnId,
        title,
        priority,
        order: nextOrder,
        dueDate,
        assigneeId,
        // do NOT write non-existent fields (e.g., description/subtitle)
        subtasks:
          subtasks.length > 0
            ? {
                create: subtasks
                  .filter((s) => typeof s === "string" && s.trim())
                  .map((t, i) => ({ title: t.trim(), order: i })),
              }
            : undefined,
      },
      include: { subtasks: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("POST /api/tasks error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
