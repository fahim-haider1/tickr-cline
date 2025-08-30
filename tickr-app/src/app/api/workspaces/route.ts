import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
})

// GET /api/workspaces - Get user's workspaces
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          }
        },
        members: {
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
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json(workspaces)
  } catch (error) {
    console.error('Error fetching workspaces:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/workspaces - Create new workspace
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = createWorkspaceSchema.parse(body)

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          }
        },
        members: true
      }
    })

    return NextResponse.json(workspace, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating workspace:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
