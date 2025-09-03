// src/app/api/invitations/pending/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json([], { status: 200 });

    const email =
      user.primaryEmailAddress?.emailAddress?.toLowerCase() ||
      user.emailAddresses?.[0]?.emailAddress?.toLowerCase();

    if (!email) return NextResponse.json([], { status: 200 });

    const invites = await prisma.workspaceInvite.findMany({
      where: {
        status: "PENDING",
        email: { equals: email, mode: "insensitive" },
      },
      include: {
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      invites.map((i) => ({
        id: i.id,
        role: i.role,
        createdAt: i.createdAt,
        workspace: i.workspace,
      }))
    );
  } catch (e) {
    console.error("GET /api/invitations/pending error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
