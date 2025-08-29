import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, role } = await request.json();
    
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Check if workspace exists and user has admin access
    const workspace = await prisma.workspace.findUnique({
      where: {
        id: params.workspaceId,
        members: {
          some: {
            userId: user.id,
            role: { in: ['ADMIN'] }
          }
        }
      },
      include: {
        members: true
      }
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 404 }
      );
    }

    // Check member limit (max 5 members excluding personal workspace)
    if (!workspace.isPersonal && workspace.members.length >= 5) {
      return NextResponse.json(
        { error: 'Workspace member limit reached (max 5 members)' },
        { status: 400 }
      );
    }

    // Check admin limit (max 2 admins)
    if (role === 'ADMIN') {
      const adminCount = workspace.members.filter(m => m.role === 'ADMIN').length;
      if (adminCount >= 2) {
        return NextResponse.json(
          { error: 'Maximum 2 admins allowed per workspace' },
          { status: 400 }
        );
      }
    }

    // Find user by email
    const targetUser = await prisma.user.findUnique({
      where: { email }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User with this email not found. They need to sign up first.' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMember = workspace.members.find(m => m.userId === targetUser.id);
    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this workspace' },
        { status: 400 }
      );
    }

    // Add user to workspace
    const newMember = await prisma.workspaceMember.create({
      data: {
        userId: targetUser.id,
        workspaceId: params.workspaceId,
        role
      },
      include: {
        user: true
      }
    });

    return NextResponse.json(newMember);
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}