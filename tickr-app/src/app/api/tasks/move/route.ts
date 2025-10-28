// src/app/api/tasks/move/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type MoveBody = {
  taskId: string;
  // server will derive sourceColumnId from DB to avoid client mismatch
  sourceColumnId?: string;
  destColumnId?: string;
  destIndex?: number;
  // accept alternative client field names
  toColumnId?: string;
  toIndex?: number;
};

export async function POST(req: Request, _context: any) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Partial<MoveBody>;
    const taskId = String(body.taskId || "");
    // accept either dest* or to* naming
    const destColumnId = String(body.destColumnId || body.toColumnId || "");
    const destIndex = Number.isFinite(body.destIndex as number)
      ? Number(body.destIndex)
      : Number.isFinite(body.toIndex as number)
      ? Number(body.toIndex)
      : 0;

    if (!taskId || !destColumnId || destIndex < 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Load task + workspace membership for auth
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        order: true,
        columnId: true,
        column: {
          select: {
            id: true,
            workspace: {
              select: {
                ownerId: true,
                members: { select: { userId: true, role: true } },
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const sourceColumnId = task.columnId;
    const ws = task.column.workspace;
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

    // Validate destination column and same workspace
    const destColumn = await prisma.column.findUnique({
      where: { id: destColumnId },
      select: {
        id: true,
        name: true,
        workspace: { select: { ownerId: true } },
      },
    });
    if (!destColumn) {
      return NextResponse.json({ error: "Destination column not found" }, { status: 404 });
    }
    if (destColumn.workspace.ownerId !== ws.ownerId) {
      return NextResponse.json({ error: "Cannot move across workspaces" }, { status: 400 });
    }

    const isSameColumn = sourceColumnId === destColumnId;

    // Do everything atomically using a callback transaction to avoid type inference issues
    await prisma.$transaction(async (tx) => {
      if (isSameColumn) {
        // Rebuild orders in the same column
        let tasks = await tx.task.findMany({
          where: { columnId: sourceColumnId },
          orderBy: { order: "asc" },
          select: { id: true, order: true },
        });

        let fromIndex = tasks.findIndex((t) => t.id === taskId);
        const clampedDest = Math.max(0, Math.min(destIndex, Math.max(tasks.length - 1, 0)));
        if (fromIndex === -1) {
          // Fallback: the task might have just moved concurrently; ensure it is represented
          const current = await tx.task.findUnique({ where: { id: taskId }, select: { id: true } });
          if (!current) return; // task vanished; treat as success
          tasks = [...tasks];
          tasks.splice(clampedDest, 0, { id: taskId, order: clampedDest });
        } else {
          // Remove and insert at new index (clamp)
          const [moved] = tasks.splice(fromIndex, 1);
          tasks.splice(clampedDest, 0, moved);
        }

        // Write back new orders
        for (let i = 0; i < tasks.length; i++) {
          const t = tasks[i];
          if (t.order !== i) {
            await tx.task.update({
              where: { id: t.id },
              data: { order: i },
            });
          }
        }
      } else {
        // Moving across columns

        // 1) Close the gap in the source column
        await tx.task.updateMany({
          where: {
            columnId: sourceColumnId,
            order: { gt: task.order },
          },
          data: { order: { decrement: 1 } },
        });

        // 2) Make room in destination column
        await tx.task.updateMany({
          where: {
            columnId: destColumnId,
            order: { gte: destIndex },
          },
          data: { order: { increment: 1 } },
        });

        // 3) Move the task itself
        await tx.task.update({
          where: { id: taskId },
          data: {
            columnId: destColumnId,
            order: destIndex,
          },
        });

        // 4) If destination column is "Done", mark all subtasks complete
        if (destColumn.name.toLowerCase() === "done") {
          await tx.subtask.updateMany({
            where: { taskId },
            data: { completed: true },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/tasks/move error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
