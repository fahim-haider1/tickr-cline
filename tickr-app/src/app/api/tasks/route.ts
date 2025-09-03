// Create task (ADMIN & MEMBER only)
// Payload: { columnId, title, description?, priority, assigneeId?, dueDate?, subtasks?: [{title}] }
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAuth, checkWorkspacePermission } from "@/lib/workspaceAuth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { columnId, title, description, priority, assigneeId, dueDate, subtasks } = body ?? {};

  if (!columnId || !title?.toString().trim()) {
    return NextResponse.json({ error: "columnId and title are required" }, { status: 400 });
  }

  // Resolve workspace from column
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    include: { workspace: { select: { id: true } }, tasks: { select: { order: true } } },
  });
  if (!column) return NextResponse.json({ error: "Column not found" }, { status: 404 });

  // Permission: create_tasks => ADMIN or MEMBER
  const auth = await requireWorkspaceAuth(column.workspaceId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const perm = await checkWorkspacePermission(column.workspaceId, "create_tasks");
  if (!("allowed" in perm) || !perm.allowed) {
    return NextResponse.json({ error: perm.error ?? "Not allowed" }, { status: 403 });
  }

  const nextOrder =
    column.tasks.length === 0 ? 0 : Math.max(...column.tasks.map((t) => t.order)) + 1;

  const created = await prisma.task.create({
    data: {
      columnId,
      title: title.toString().trim(),
      description: description?.toString() ?? null,
      priority: ["LOW", "MEDIUM", "HIGH"].includes(priority) ? priority : "MEDIUM",
      order: nextOrder,
      dueDate: dueDate ? new Date(dueDate) : null,
      assigneeId: assigneeId || null,
      subtasks: {
        create: Array.isArray(subtasks)
          ? subtasks
              .map((s: any, i: number) => ({
                title: (s?.title ?? "").toString().trim(),
                order: i,
              }))
              .filter((s) => s.title.length > 0)
          : [],
      },
    },
    include: {
      subtasks: true,
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(created, { status: 201 });
}
