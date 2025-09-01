import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET: return only the current user's workspaces
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json([], { status: 200 })

  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(workspaces)
}

// POST: create a workspace for the current user
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description } = await req.json()

  // Ensure the Clerk user exists in our DB so the FK (ownerId) never fails
  const cuser = await currentUser().catch(() => null)
  const email =
    cuser?.emailAddresses?.[0]?.emailAddress ??
    (Array.isArray((cuser as any)?.email_addresses)
      ? (cuser as any).email_addresses[0]?.email_address
      : "") ??
    ""

  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email,
      name:
        [cuser?.firstName, cuser?.lastName].filter(Boolean).join(" ") ||
        (cuser as any)?.first_name ||
        null,
      image: cuser?.imageUrl ?? (cuser as any)?.image_url ?? null,
    },
  })

  const ws = await prisma.workspace.create({
    data: {
      name,
      description: description ?? null,
      ownerId: userId,
      // optional: also register the owner as a member
      members: {
        create: { userId, role: "ADMIN" },
      },
    },
  })

  return NextResponse.json(ws, { status: 201 })
}
