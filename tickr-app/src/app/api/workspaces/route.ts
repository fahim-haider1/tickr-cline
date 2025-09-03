// src/app/api/workspaces/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET: return only this user's workspaces; if none, create a Personal Workspace (with Todo/Done)
// Also ensures the Prisma User row exists to avoid FK errors on first visit.
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      // unauthenticated users just get an empty list (so the UI doesn't crash)
      return NextResponse.json([], { status: 200 });
    }

    // Ensure the Prisma User row exists (first-visit race fix)
    let dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser) {
      const cu = await currentUser().catch(() => null);

      // pull a primary email if available
      const primaryEmail =
        cu?.primaryEmailAddress?.emailAddress ??
        cu?.emailAddresses?.[0]?.emailAddress ??
        `${userId}@example.local`; // safe fallback to satisfy NOT NULL + UNIQUE

      const fullName = `${cu?.firstName ?? ""} ${cu?.lastName ?? ""}`.trim() || null;

      dbUser = await prisma.user.create({
        data: {
          id: userId,
          email: primaryEmail.toLowerCase(),
          name: fullName,
          image: cu?.imageUrl ?? null,
        },
      });
    }

    // Existing workspaces or seed a personal one
    let workspaces = await prisma.workspace.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
      include: { columns: true },
    });

    if (workspaces.length === 0) {
      const ws = await prisma.workspace.create({
        data: {
          name: "Personal Workspace",
          isPersonal: true,
          ownerId: userId,
          // If you store owner as a member too, keep this:
          members: { create: { userId, role: "ADMIN" } },
          columns: {
            create: [
              { name: "Todo", order: 0 },
              { name: "Done", order: 1 },
            ],
          },
        },
        include: { columns: true },
      });
      workspaces = [ws];
    }

    return NextResponse.json(workspaces);
  } catch (err) {
    console.error("GET /api/workspaces failed:", err);
    // Be forgiving on first-load — return empty list instead of 500 so UI doesn't crash
    return NextResponse.json([], { status: 200 });
  }
}

// POST: create a workspace for this user (seed Todo/Done)
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await req.json().catch(() => ({}) as any);
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const ws = await prisma.workspace.create({
    data: {
      name: name.trim(),
      description: description ?? null,
      ownerId: userId,
      // If you keep owner in members, seed as ADMIN:
      members: { create: { userId, role: "ADMIN" } },
      columns: {
        create: [
          { name: "Todo", order: 0 },
          { name: "Done", order: 1 },
        ],
      },
    },
    include: { columns: true },
  });

  return NextResponse.json(ws, { status: 201 });
}
