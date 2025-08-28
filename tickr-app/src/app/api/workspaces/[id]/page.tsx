// src/app/api/workspaces/[id]/page.tsx
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { KanbanBoard } from '@/components/board/KanbanBoard';

interface WorkspacePageProps {
  params: { id: string };
}

// Helper function to transform Date objects to strings
function transformColumns(columns: any[]) {
  return columns.map(column => ({
    ...column,
    tasks: column.tasks.map((task: any) => ({
      ...task,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      // Convert other Date fields if needed
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      subtasks: task.subtasks.map((subtask: any) => ({
        ...subtask,
        createdAt: subtask.createdAt.toISOString(),
        updatedAt: subtask.updatedAt.toISOString()
      }))
    }))
  }));
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const user = await currentUser();
  
  if (!user) {
    return notFound();
  }

  const workspace = await prisma.workspace.findUnique({
    where: {
      id: params.id,
      members: {
        some: {
          userId: user.id
        }
      }
    },
    include: {
      columns: {
        include: {
          tasks: {
            include: {
              assignee: true,
              subtasks: true
            },
            orderBy: {
              order: 'asc'
            }
          }
        },
        orderBy: {
          order: 'asc'
        }
      }
    }
  });

  if (!workspace) {
    return notFound();
  }

  // Transform the columns data before passing to KanbanBoard
  const transformedColumns = transformColumns(workspace.columns);

  return (
    <div className="flex-1">
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-bold">{workspace.name}</h1>
        {workspace.description && (
          <p className="text-gray-600">{workspace.description}</p>
        )}
      </div>
      <KanbanBoard columns={transformedColumns} workspaceId={workspace.id} />
    </div>
  );
}