// src/app/api/workspaces/route.ts
import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET: return only this user's workspaces; if none, create a Personal Workspace (with Todo/Done)
// ALSO ensures the Prisma User row exists to avoid FK errors on first visit.
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json([], { status: 200 })

    // --- Ensure the Prisma User row exists (first-visit race fix) ---
    let dbUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!dbUser) {
      const cu = await clerkClient.users.getUser(userId)
      const primary = cu?.emailAddresses?.find(e => e.id === cu.primaryEmailAddressId)

      dbUser = await prisma.user.create({
        data: {
          id: userId,
          email: primary?.emailAddress ?? `${userId}@example.local`, // fallback to satisfy NOT NULL + UNIQUE
          name: `${cu?.firstName ?? ""} ${cu?.lastName ?? ""}`.trim() || null,
          image: cu?.imageUrl ?? null,
        },
      })
    }
    // ---------------------------------------------------------------

    // Existing or seed a personal workspace
    let workspaces = await prisma.workspace.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
      include: { columns: true },  // ✅ always include columns
    })

    if (workspaces.length === 0) {
      const ws = await prisma.workspace.create({
        data: {
          name: "Personal Workspace",
          isPersonal: true,
          ownerId: userId,
          members: { create: { userId, role: "ADMIN" } },
          columns: {
            create: [
              { name: "Todo", order: 0 },
              { name: "Done", order: 1 },
            ],
          },
        },
        include: { columns: true },  // ✅ return seeded columns immediately
      })
      workspaces = [ws]
    }

    return NextResponse.json(workspaces)
  } catch (err) {
    console.error("GET /api/workspaces failed:", err)
    // Be forgiving on first-load — return empty list instead of 500 so UI doesn't crash
    return NextResponse.json([], { status: 200 })
  }
}

// POST: create a workspace for this user (seed Todo/Done)
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 })
  }

  const ws = await prisma.workspace.create({
    data: {
      name: name.trim(),
      description: description ?? null,
      ownerId: userId,
      members: { create: { userId, role: "ADMIN" } },
      columns: {
        create: [
          { name: "Todo", order: 0 },
          { name: "Done", order: 1 },
        ],
      },
    },
    include: { columns: true },  // ✅ also include seeded columns here
  })

  return NextResponse.json(ws, { status: 201 })
}
