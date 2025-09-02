// src/app/api/tasks/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/tasks
 * Body: {
 *   columnId: string,
 *   title: string,
 *   description?: string,  // short subtitle
 *   details?: string,      // long description
 *   priority?: "LOW"|"MEDIUM"|"HIGH",
 *   dueDate?: string | Date,
 *   assigneeId?: string,
 *   subtasks?: Array<{ title: string; completed?: boolean }>
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const columnId = String(body?.columnId || "");
    const title = String(body?.title || "").trim();
    const description = body?.description ? String(body.description) : null; // subtitle
    const rawPriority = String(body?.priority || "MEDIUM").toUpperCase();
    const priority = rawPriority === "LOW" || rawPriority === "HIGH" ? rawPriority : "MEDIUM";
    const assigneeId = body?.assigneeId ? String(body.assigneeId) : null;
    const dueDate = body?.dueDate ? new Date(body.dueDate) : null;

    const subtasksInput = Array.isArray(body?.subtasks) ? body.subtasks : [];
    const subtaskCreates =
      subtasksInput
        .map((s: any, idx: number) => ({
          title: String(s?.title || "").trim(),
          completed: Boolean(s?.completed ?? false),
          order: idx,
        }))
        .filter((s: any) => s.title.length > 0) || [];

    if (!columnId || !title) {
      return NextResponse.json({ error: "columnId and title are required" }, { status: 400 });
    }

    // Access: must be owner/admin/member of the workspace that owns the column
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

    // Build data dynamically so we only pass fields that exist on the client
    const data: any = {
      title,
      description,                   // subtitle
      priority,
      order: (maxOrder._max.order ?? -1) + 1,
      dueDate,
      assigneeId: assigneeId || undefined,
      columnId,
      ...(subtaskCreates.length ? { subtasks: { create: subtaskCreates } } : {}),
    };

    // ✅ Pass `details` only if request actually provided one.
    // (Your create dialog doesn't send it, so we won't include it and old Prisma clients won't complain.)
    if (typeof body?.details === "string" && body.details.trim().length > 0) {
      data.details = String(body.details);
    }

    const task = await prisma.task.create({
      data,
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
