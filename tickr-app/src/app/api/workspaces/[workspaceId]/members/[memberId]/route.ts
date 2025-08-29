import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireWorkspaceAuth } from '@/lib/workspaceAuth'; // Add this import

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workspaceId: string; memberId: string } }
) {
  try {
    // Replace manual auth check with utility
    const authResult = await requireWorkspaceAuth(params.workspaceId, 'ADMIN');
    
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;

    // Check if workspace is personal (prevent modification)
    const workspace = await prisma.workspace.findUnique({
      where: { id: params.workspaceId },
      include: { members: true }
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    if (workspace.isPersonal) {
      return NextResponse.json(
        { error: 'Cannot modify members in personal workspace' },
        { status: 400 }
      );
    }

    // Get the target member
    const targetMember = await prisma.workspaceMember.findUnique({
      where: { id: params.memberId },
      include: { user: true }
    });

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
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

    return NextResponse.json({ 
      success: true,
      message: 'Member removed successfully' 
    });
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
    // Replace manual auth check with utility
    const authResult = await requireWorkspaceAuth(params.workspaceId, 'ADMIN');
    
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;

    const { role } = await request.json();
    
    if (!role || !['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role is required (ADMIN, MEMBER, or VIEWER)' },
        { status: 400 }
      );
    }

    // Check if workspace is personal (prevent modification)
    const workspace = await prisma.workspace.findUnique({
      where: { id: params.workspaceId },
      include: { members: true }
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    if (workspace.isPersonal) {
      return NextResponse.json(
        { error: 'Cannot modify roles in personal workspace' },
        { status: 400 }
      );
    }

    // Get the target member
    const targetMember = await prisma.workspaceMember.findUnique({
      where: { id: params.memberId }
    });

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
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

    return NextResponse.json({
      success: true,
      message: `Role updated to ${role}`,
      member: updatedMember
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}