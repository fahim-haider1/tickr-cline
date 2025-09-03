// src/app/api/workspaces/route.ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

// GET: return only this user's workspaces; seed a personal one if none exists
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json([], { status: 200 })

    // Ensure user row exists in Prisma
    let dbUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!dbUser) {
      const cu = await clerkClient.users.getUser(userId)
      const primary = cu?.emailAddresses?.find(e => e.id === cu.primaryEmailAddressId)

      dbUser = await prisma.user.create({
        data: {
          id: userId,
          email: primary?.emailAddress ?? `${userId}@example.local`,
          name: `${cu?.firstName ?? ""} ${cu?.lastName ?? ""}`.trim() || null,
          image: cu?.imageUrl ?? null,
        },
      })
    }

    // Get workspaces owned by user
    let workspaces = await prisma.workspace.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
      include: { columns: true },
    })

    // If none, seed a "Personal Workspace"
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
        include: { columns: true },
      })
      workspaces = [ws]
    }

    return NextResponse.json(workspaces)
  } catch (err) {
    console.error("GET /api/workspaces failed:", err)
    // Return [] instead of 500 so UI doesn’t break on first load
    return NextResponse.json([], { status: 200 })
  }
}

// POST: create a new workspace (seed Todo/Done columns)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { name, description } = body

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
      include: { columns: true },
    })

    return NextResponse.json(ws, { status: 201 })
  } catch (err) {
    console.error("POST /api/workspaces failed:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
