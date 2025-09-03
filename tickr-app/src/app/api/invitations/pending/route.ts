// src/app/api/invitations/pending/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json([], { status: 200 });

    // Prefer DB email (if you sync users), fallback to Clerk
    let email: string | null = null;
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    email = dbUser?.email?.toLowerCase() ?? null;

    if (!email) {
      const cu = await currentUser().catch(() => null);
      email =
        (cu?.primaryEmailAddress?.emailAddress ||
          cu?.emailAddresses?.[0]?.emailAddress ||
          null)?.toLowerCase() ?? null;
    }

    if (!email) return NextResponse.json([], { status: 200 });

    const invites = await prisma.workspaceInvite.findMany({
      where: {
        status: "PENDING",
        email: { equals: email, mode: "insensitive" }, // robust matching
      },
      include: {
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // return compact shape used by PrimarySidebar / Kanban sidebar
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
