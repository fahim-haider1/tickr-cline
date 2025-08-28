import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
})

// GET /api/workspaces/[id] - Get specific workspace
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

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: id,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      },
      include: {
        owner: true,
        members: {
          include: {
            user: true
          }
        },
        columns: {
          include: {
            tasks: {
              include: {
                subtasks: true,
                assignee: true
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    return NextResponse.json(workspace)
  } catch (error) {
    console.error('Error fetching workspace:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/workspaces/[id] - Update workspace
export async function PUT(
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
    const { name, description } = updateWorkspaceSchema.parse(body)

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

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
      include: {
        owner: true,
        members: {
          include: {
            user: true
          }
        },
        columns: {
          include: {
            tasks: true
          }
        }
      }
    })

    return NextResponse.json(updatedWorkspace)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error updating workspace:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/workspaces/[id] - Delete workspace
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if user is owner
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: id,
        ownerId: userId
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found or insufficient permissions' }, { status: 404 })
    }

    await prisma.workspace.delete({
      where: { id: id }
    })

    return NextResponse.json({ message: 'Workspace deleted successfully' })
  } catch (error) {
    console.error('Error deleting workspace:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
