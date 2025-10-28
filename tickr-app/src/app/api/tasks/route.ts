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
  description?: string | null; // maps to DB "subtitle"
  // Allow either list of strings or objects with { title }
  subtasks?: Array<string | { title: string }>;
};

function parseDueDate(input?: string | null): Date | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  const iso = s.length <= 10 ? `${s}T00:00:00.000Z` : s;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const t = d.getTime();
  if (!Number.isFinite(t)) return null;
  return d;
}

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
    const dueDate = parseDueDate(body.dueDate ?? null);
    const assigneeId = body.assigneeId || null;
    const description = typeof body.description === "string" ? body.description.trim() : undefined;
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
        // map client description -> DB subtitle
        subtitle: description ?? undefined,
        subtasks:
          subtasks.length > 0
            ? {
                create: subtasks
                  .map((s, i) =>
                    typeof s === "string"
                      ? { title: s.trim(), order: i }
                      : { title: String(s?.title ?? "").trim(), order: i }
                  )
                  .filter((x) => x.title)
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
