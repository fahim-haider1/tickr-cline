import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description } = await request.json();

    // Check if user has reached workspace limit
    const userWorkspaceCount = await prisma.workspace.count({
      where: {
        ownerId: user.id,
        isPersonal: false
      }
    });

    if (userWorkspaceCount >= 10) {
      return NextResponse.json(
        { error: 'You can only create up to 10 workspaces' },
        { status: 400 }
      );
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        ownerId: user.id,
        isPersonal: false,
        columns: {
          create: [
            { name: 'Todo', order: 1 },
            { name: 'Done', order: 2 }
          ]
        },
        members: {
          create: {
            userId: user.id,
            role: 'ADMIN'
          }
        }
      },
      include: {
        members: {
          include: {
            user: true
          }
        },
        columns: true
      }
    });

    return NextResponse.json(workspace);
  } catch (error) {
    console.error('Error creating workspace:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}