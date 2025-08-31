// src/app/api/workspaces/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// UPDATE workspace name
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();

  const updated = await prisma.workspace.updateMany({
    where: { id: params.id, ownerId: userId },
    data: { name },
  });

  return NextResponse.json(updated);
}

// DELETE workspace
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.workspace.deleteMany({
    where: { id: params.id, ownerId: userId },
  });

  return NextResponse.json({ success: true });
}
