import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireWorkspaceAuth, checkWorkspacePermission } from '@/lib/workspaceAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    // Basic workspace access check
    const authResult = await requireWorkspaceAuth(params.workspaceId);
    
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;

    // Specific permission check for task creation
    const permissionCheck = await checkWorkspacePermission(params.workspaceId, 'create_tasks');
    if (!permissionCheck.allowed) {
      return NextResponse.json({ error: permissionCheck.error }, { status: 403 });
    }

    // Parse request data
    const { title, description, columnId, priority, dueDate, assigneeId, subtasks } = await request.json();
    
    // Validation
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Task title is required' },
        { status: 400 }
      );
    }

    if (!columnId) {
      return NextResponse.json(
        { error: 'Column ID is required' },
        { status: 400 }
      );
    }

    // Verify column exists in this workspace
    const column = await prisma.column.findFirst({
      where: {
        id: columnId,
        workspaceId: params.workspaceId
      }
    });

    if (!column) {
      return NextResponse.json(
        { error: 'Column not found in this workspace' },
        { status: 404 }
      );
    }

    // Verify assignee is a member of this workspace (if provided)
    if (assigneeId) {
      const assigneeMember = await prisma.workspaceMember.findFirst({
        where: {
          userId: assigneeId,
          workspaceId: params.workspaceId
        }
      });

      if (!assigneeMember) {
        return NextResponse.json(
          { error: 'Assignee must be a member of this workspace' },
          { status: 400 }
        );
      }
    }

    // Get the highest order number in the column to place new task at the bottom
    const lastTask = await prisma.task.findFirst({
      where: { columnId },
      orderBy: { order: 'desc' },
      select: { order: true }
    });

    const newOrder = (lastTask?.order || 0) + 1;

    // Create the task
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim(),
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        order: newOrder,
        columnId,
        assigneeId: assigneeId || null,
        // Create subtasks if provided
        subtasks: subtasks && subtasks.length > 0 ? {
          create: subtasks
            .filter((subtask: any) => subtask.title && subtask.title.trim())
            .map((subtask: any, index: number) => ({
              title: subtask.title.trim(),
              order: index,
              completed: false
            }))
        } : undefined
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        subtasks: true,
        column: true
      }
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET all tasks for a workspace
export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    // Basic workspace access check
    const authResult = await requireWorkspaceAuth(params.workspaceId);
    
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get all tasks with their relationships
    const tasks = await prisma.task.findMany({
      where: {
        column: {
          workspaceId: params.workspaceId
        }
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        subtasks: {
          orderBy: { order: 'asc' }
        },
        column: {
          select: {
            id: true,
            name: true,
            order: true
          }
        }
      },
      orderBy: [
        { column: { order: 'asc' } },
        { order: 'asc' }
      ]
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}