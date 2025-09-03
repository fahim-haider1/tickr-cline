// src/app/api/invitations/[inviteId]/decline/route.ts
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
    });
    if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

    if (invite.status !== "PENDING") {
      return NextResponse.json({ error: "Invite is not pending" }, { status: 400 });
    }
    if (invite.email.toLowerCase() !== email) {
      return NextResponse.json({ error: "Invite does not belong to this user" }, { status: 403 });
    }

    await prisma.workspaceInvite.update({
      where: { id: inviteId },
      data: { status: "DECLINED" },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/invitations/[inviteId]/decline error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
