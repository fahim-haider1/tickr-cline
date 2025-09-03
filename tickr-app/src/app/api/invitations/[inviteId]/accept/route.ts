// src/app/api/invitations/[inviteId]/accept/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ inviteId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { inviteId } = await ctx.params;

  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email =
      user.primaryEmailAddress?.emailAddress?.toLowerCase() ||
      user.emailAddresses?.[0]?.emailAddress?.toLowerCase();

    if (!email) return NextResponse.json({ error: "Missing user email" }, { status: 400 });

    const invite = await prisma.workspaceInvite.findUnique({
      where: { id: inviteId },
      include: { workspace: true },
    });
    if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

    if (invite.status !== "PENDING") {
      return NextResponse.json({ error: "Invite is not pending" }, { status: 400 });
    }
    if (invite.email.toLowerCase() !== email) {
      return NextResponse.json({ error: "Invite does not belong to this user" }, { status: 403 });
    }

    // Enforce max 2 admins
    if (invite.role === "ADMIN") {
      const adminCount = await prisma.workspaceMember.count({
        where: { workspaceId: invite.workspaceId, role: "ADMIN" },
      });
      if (adminCount >= 2) {
        return NextResponse.json(
          { error: "Maximum of 2 admins allowed in a workspace." },
          { status: 400 }
        );
      }
    }

    // Idempotent accept: mark accepted, attach membership if not there
    await prisma.$transaction(async (tx) => {
      const existingMember = await tx.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: invite.workspaceId,
          },
        },
      });

      if (!existingMember) {
        await tx.workspaceMember.create({
          data: {
            userId: user.id,
            workspaceId: invite.workspaceId,
            role: invite.role as any,
          },
        });
      }

      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED" },
      });
    });

    return NextResponse.json({ success: true, workspaceId: invite.workspaceId });
  } catch (e) {
    console.error("POST /api/invitations/[inviteId]/accept error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
