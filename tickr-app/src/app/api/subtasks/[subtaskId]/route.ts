// src/app/api/subtasks/[subtaskId]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/subtasks/:subtaskId  body: { completed: boolean }
export async function PATCH(req: NextRequest, { params }: { params: { subtaskId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { completed } = await req.json().catch(() => ({ completed: undefined as unknown as boolean }));
    if (typeof completed !== "boolean") {
      return NextResponse.json({ error: "completed must be boolean" }, { status: 400 });
    }

    // Access check by walking subtask -> task -> column -> workspace
    const sub = await prisma.subtask.findUnique({
      where: { id: params.subtaskId },
      select: {
        task: {
          select: {
            column: {
              select: {
                workspace: {
                  select: { ownerId: true, members: { select: { userId: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ws = sub.task.column.workspace;
    const isMember = ws.ownerId === userId || ws.members.some(m => m.userId === userId);
    if (!isMember) return NextResponse.json({ error: "No access" }, { status: 403 });

    const updated = await prisma.subtask.update({
      where: { id: params.subtaskId },
      data: { completed },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH subtask error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
