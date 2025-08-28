import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateMemberSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
})

// PUT /api/workspaces/[id]/members/[memberId] - Update member role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, memberId } = await params
    const body = await request.json()
    const { role } = updateMemberSchema.parse(body)

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

    // Find the member to update
    const member = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          }
        }
      }
    })

    if (!member || member.workspaceId !== id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent updating owner role through this endpoint
    if (workspace.ownerId === member.userId) {
      return NextResponse.json({ error: 'Cannot update workspace owner role' }, { status: 400 })
    }

    // Update member role
    const updatedMember = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
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

    return NextResponse.json(updatedMember)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error updating member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/workspaces/[id]/members/[memberId] - Remove member from workspace
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, memberId } = await params

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

    // Find the member to remove
    const member = await prisma.workspaceMember.findUnique({
      where: { id: memberId }
    })

    if (!member || member.workspaceId !== id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent removing owner through this endpoint
    if (workspace.ownerId === member.userId) {
      return NextResponse.json({ error: 'Cannot remove workspace owner' }, { status: 400 })
    }

    // Allow users to remove themselves
    const canRemove = workspace.ownerId === userId || 
                     member.userId === userId ||
                     await prisma.workspaceMember.findFirst({
                       where: {
                         workspaceId: id,
                         userId: userId,
                         role: 'ADMIN'
                       }
                     })

    if (!canRemove) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Remove member
    await prisma.workspaceMember.delete({
      where: { id: memberId }
    })

    return NextResponse.json({ message: 'Member removed successfully' })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
