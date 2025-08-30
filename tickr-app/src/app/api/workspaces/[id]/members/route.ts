import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
})

// GET /api/workspaces/[id]/members - Get workspace members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if user has access to workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: id,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Get all members
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        joinedAt: 'asc'
      }
    })

    // Add owner as member if not already included
    const owner = await prisma.user.findUnique({
      where: { id: workspace.ownerId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
      }
    })

    const ownerAsMember = members.find(m => m.userId === workspace.ownerId)
    
    if (!ownerAsMember && owner) {
      const ownerMember = {
        id: 'owner',
        workspaceId: id,
        userId: workspace.ownerId,
        role: 'ADMIN' as const,
        joinedAt: workspace.createdAt,
        user: owner
      }
      members.unshift(ownerMember as any)
    }

    return NextResponse.json(members)
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/workspaces/[id]/members - Invite new member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { email, role } = inviteMemberSchema.parse(body)

    // Check if user has admin rights
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: id,
        OR: [
          { ownerId: userId },
          { 
            members: { 
              some: { 
                userId,
                role: 'ADMIN'
              } 
            } 
          }
        ]
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found or insufficient permissions' }, { status: 404 })
    }

    // Find user by email
    const invitedUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      }
    })

    if (!invitedUser) {
      return NextResponse.json({ error: 'User not found. User must sign up first.' }, { status: 404 })
    }

    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: id,
        userId: invitedUser.id
      }
    })

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this workspace' }, { status: 400 })
    }

    // Check if user is the owner
    if (workspace.ownerId === invitedUser.id) {
      return NextResponse.json({ error: 'User is already the owner of this workspace' }, { status: 400 })
    }

    // Add member to workspace
    const newMember = await prisma.workspaceMember.create({
      data: {
        workspaceId: id,
        userId: invitedUser.id,
        role: role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            createdAt: true,
          }
        }
      }
    })

    return NextResponse.json(newMember, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error inviting member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
