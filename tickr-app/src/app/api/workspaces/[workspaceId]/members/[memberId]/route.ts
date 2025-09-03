// Enforce: only ADMINs can promote/demote/remove members
// Limits: max 2 admins; removal allowed (owner not stored as member)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAuth } from "@/lib/workspaceAuth";

type Params = { params: { workspaceId: string; memberId: string } };

export async function PUT(req: Request, { params }: Params) {
  const { workspaceId, memberId } = params;

  const auth = await requireWorkspaceAuth(workspaceId, "ADMIN");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const nextRole: "ADMIN" | "MEMBER" | "VIEWER" | undefined = body?.role;
  if (!nextRole || !["ADMIN", "MEMBER", "VIEWER"].includes(nextRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
  });
  if (!member || member.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // If promoting to ADMIN, enforce ≤2 admins
  if (nextRole === "ADMIN" && member.role !== "ADMIN") {
    const adminCount = await prisma.workspaceMember.count({
      where: { workspaceId, role: "ADMIN" },
    });
    if (adminCount >= 2) {
      return NextResponse.json(
        { error: "Maximum of 2 admins allowed in a workspace." },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role: nextRole },
    include: { user: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { workspaceId, memberId } = params;

  const auth = await requireWorkspaceAuth(workspaceId, "ADMIN");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    include: { user: true },
  });
  if (!member || member.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  await prisma.workspaceMember.delete({ where: { id: memberId } });
  return NextResponse.json({ success: true });
}
