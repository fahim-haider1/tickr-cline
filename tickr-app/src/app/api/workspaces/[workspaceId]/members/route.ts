// src/app/api/workspaces/[workspaceId]/members/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAuth } from "@/lib/workspaceAuth";

// Canonicalize email (Gmail: strip dots, drop +label)
function canon(email: string) {
  const e = email.trim().toLowerCase();
  const [localRaw, domainRaw = ""] = e.split("@");
  const domain = domainRaw.toLowerCase();
  let local = localRaw.toLowerCase();
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.split("+")[0].replace(/\./g, "");
    return `${local}@gmail.com`;
  }
  return `${local}@${domain}`;
}

// GET /api/workspaces/:workspaceId/members
export async function GET(_req: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await context.params;

  // Ensure the workspace exists (and caller can at least see it)
  const authz = await requireWorkspaceAuth(workspaceId, "VIEWER");
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members);
}

// POST /api/workspaces/:workspaceId/members
// Create an invitation (ADMINs only)
export async function POST(req: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await context.params;

  const authz = await requireWorkspaceAuth(workspaceId, "ADMIN");
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const inviterId =
    // prefer user.id from helper; fall back to membership.userId just in case
    (authz as any).user?.id ?? (authz as any).membership?.userId ?? null;

  const body = (await req.json().catch(() => ({}))) as Partial<{
    email: string;
    role: "ADMIN" | "MEMBER" | "VIEWER";
  }>;

  const emailRaw = (body.email || "").toString().trim();
  const role = (body.role || "MEMBER") as "ADMIN" | "MEMBER" | "VIEWER";

  if (!emailRaw || !["ADMIN", "MEMBER", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const emailLower = emailRaw.toLowerCase();
  const emailNorm = canon(emailLower);

  // If inviting as ADMIN, enforce ≤2 admins
  if (role === "ADMIN") {
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

  // Workspace must exist
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, ownerId: true },
  });
  if (!ws) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // If user exists already, block inviting owner or existing member
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: emailLower, mode: "insensitive" } },
        { email: { equals: emailNorm, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  if (existingUser?.id === ws.ownerId) {
    return NextResponse.json({ error: "Owner already has access" }, { status: 400 });
  }

  if (existingUser) {
    const existingMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: existingUser.id, workspaceId } },
      select: { id: true },
    });
    if (existingMember) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }
  }

  // Reuse existing PENDING invite, match on raw or canonical email
  const existingPending = await prisma.workspaceInvite.findFirst({
    where: {
      workspaceId,
      status: "PENDING",
      OR: [
        { email: { equals: emailLower, mode: "insensitive" } },
        { email: { equals: emailNorm, mode: "insensitive" } },
      ],
    },
    include: { workspace: { select: { id: true, name: true, isPersonal: true } } },
  });
  if (existingPending) {
    return NextResponse.json(existingPending, { status: 200 });
  }

  // Create invite with canonical email
  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId,
      email: emailNorm,
      role,
      invitedById: inviterId,
      status: "PENDING",
    },
    include: { workspace: { select: { id: true, name: true, isPersonal: true} } },
  });

  return NextResponse.json(invite, { status: 201 });
}
