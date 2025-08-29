import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workspaceId: string; memberId: string } }
) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin of this workspace
    const workspace = await prisma.workspace.findUnique({
      where: {
        id: params.workspaceId,
        members: {
          some: {
            userId: user.id,
            role: { in: ['ADMIN'] }
          }
        }
      }
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 404 }
      );
    }

    // Get the target member to check if it's the current user
    const targetMember = await prisma.workspaceMember.findUnique({
      where: { id: params.memberId },
      include: { user: true }
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Prevent self-removal
    if (targetMember.userId === user.id) {
      return NextResponse.json(
        { error: 'Cannot remove yourself from workspace' },
        { status: 400 }
      );
    }

    // Prevent removing the workspace owner
    if (targetMember.userId === workspace.ownerId) {
      return NextResponse.json(
        { error: 'Cannot remove the workspace owner' },
        { status: 400 }
      );
    }

    // Remove member
    await prisma.workspaceMember.delete({
      where: { id: params.memberId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { workspaceId: string; memberId: string } }
) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = await request.json();
    
    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

    // Check if user is admin of this workspace
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

    // Get the target member
    const targetMember = await prisma.workspaceMember.findUnique({
      where: { id: params.memberId }
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Check admin limit when promoting to ADMIN
    if (role === 'ADMIN') {
      const adminCount = workspace.members.filter(m => m.role === 'ADMIN').length;
      if (adminCount >= 2) {
        return NextResponse.json(
          { error: 'Maximum 2 admins allowed per workspace' },
          { status: 400 }
        );
      }
    }

    // Prevent changing owner's role
    if (targetMember.userId === workspace.ownerId) {
      return NextResponse.json(
        { error: 'Cannot change role of workspace owner' },
        { status: 400 }
      );
    }

    // Update member role
    const updatedMember = await prisma.workspaceMember.update({
      where: { id: params.memberId },
      data: { role },
      include: {
        user: true
      }
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}