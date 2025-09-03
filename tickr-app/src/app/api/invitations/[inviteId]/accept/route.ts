// src/app/api/invitations/[inviteId]/accept/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ inviteId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { inviteId } = await ctx.params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Resolve user's email (to verify recipient)
  let email: string | null = null;
  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  email = dbUser?.email?.toLowerCase() ?? null;
  if (!email) {
    const cu = await currentUser().catch(() => null);
    email =
      (cu?.primaryEmailAddress?.emailAddress ||
        cu?.emailAddresses?.[0]?.emailAddress ||
        null)?.toLowerCase() ?? null;
  }
  if (!email) return NextResponse.json({ error: "No email on file" }, { status: 400 });

  const invite = await prisma.workspaceInvite.findUnique({
    where: { id: inviteId },
    include: { workspace: { select: { id: true, ownerId: true } } },
  });
  if (!invite || invite.status !== "PENDING")
    return NextResponse.json({ error: "Invite not found or not pending" }, { status: 404 });

  if (invite.email.toLowerCase() !== email) {
    return NextResponse.json({ error: "This invite is not for your email" }, { status: 403 });
  }

  // Already a member? Just mark as accepted.
  const existingMember = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: invite.workspaceId } },
    select: { id: true },
  });
  if (existingMember) {
    await prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    });
    return NextResponse.json({ success: true, workspaceId: invite.workspaceId });
  }

  // Enforce ≤2 admins when accepting ADMIN invite
  if (invite.role === "ADMIN") {
    const adminCount = await prisma.workspaceMember.count({
      where: { workspaceId: invite.workspaceId, role: "ADMIN" },
    });
    if (adminCount >= 2) {
      return NextResponse.json(
        { error: "Workspace already has the maximum of 2 admins" },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction([
    prisma.workspaceMember.create({
      data: {
        workspaceId: invite.workspaceId,
        userId,
        role: invite.role,
      },
    }),
    prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    }),
  ]);

  return NextResponse.json({ success: true, workspaceId: invite.workspaceId });
}
