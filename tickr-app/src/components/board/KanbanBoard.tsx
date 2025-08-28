'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  order: number;
  dueDate: string | null;
  assignee: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  subtasks: Subtask[];
  columnId: string;
}

interface Column {
  id: string;
  name: string;
  order: number;
  tasks: Task[];
}

interface KanbanBoardProps {
  columns: Column[];
  workspaceId: string;
}

export function KanbanBoard({ columns: initialColumns, workspaceId }: KanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [isCreatingTask, setIsCreatingTask] = useState<string | null>(null);

  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === 'column') {
      const newColumns = Array.from(columns);
      const [removed] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, removed);

      // Update column orders
      const updatedColumns = newColumns.map((col, index) => ({
        ...col,
        order: index
      }));

      setColumns(updatedColumns);

      // Update in database
      await updateColumnOrders(updatedColumns);
      return;
    }

    // Handle task movement
    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destColumn = columns.find(col => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) return;

    if (source.droppableId === destination.droppableId) {
      // Moving within same column
      const newTasks = Array.from(sourceColumn.tasks);
      const [removed] = newTasks.splice(source.index, 1);
      newTasks.splice(destination.index, 0, removed);

      const updatedColumns = columns.map(col =>
        col.id === source.droppableId
          ? { ...col, tasks: newTasks }
          : col
      );

      setColumns(updatedColumns);
      await updateTaskOrders(newTasks, source.droppableId);
    } else {
      // Moving to different column
      const sourceTasks = Array.from(sourceColumn.tasks);
      const destTasks = Array.from(destColumn.tasks);
      const [removed] = sourceTasks.splice(source.index, 1);
      
      // If moving to "Done" column, complete all subtasks
      const updatedTask = destColumn.name.toLowerCase() === 'done' 
        ? { ...removed, subtasks: removed.subtasks.map(st => ({ ...st, completed: true })) }
        : removed;

      destTasks.splice(destination.index, 0, updatedTask);

      const updatedColumns = columns.map(col => {
        if (col.id === source.droppableId) {
          return { ...col, tasks: sourceTasks };
        }
        if (col.id === destination.droppableId) {
          return { ...col, tasks: destTasks };
        }
        return col;
      });

      setColumns(updatedColumns);
      await moveTask(removed.id, destination.droppableId, destination.index);
    }
  };

  const updateColumnOrders = async (columns: Column[]) => {
    try {
      await fetch('/api/columns/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns }),
      });
    } catch (error) {
      console.error('Error updating column orders:', error);
    }
  };

  const updateTaskOrders = async (tasks: Task[], columnId: string) => {
    try {
      await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, columnId }),
      });
    } catch (error) {
      console.error('Error updating task orders:', error);
    }
  };

  const moveTask = async (taskId: string, columnId: string, order: number) => {
    try {
      await fetch(`/api/tasks/${taskId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId, order }),
      });
    } catch (error) {
      console.error('Error moving task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      // Remove from local state
      setColumns(columns.map(col => ({
        ...col,
        tasks: col.tasks.filter(task => task.id !== taskId)
      })));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="board" type="column" direction="horizontal">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="flex space-x-4 p-4 overflow-x-auto min-h-screen"
          >
            {columns.map((column, index) => (
              <Draggable key={column.id} draggableId={column.id} index={index}>
                {(provided) => (
                  <div
                    {...provided.draggableProps}
                    ref={provided.innerRef}
                    className="bg-gray-100 rounded-lg w-80 flex-shrink-0"
                  >
                    <div {...provided.dragHandleProps} className="p-3 border-b flex items-center justify-between">
                      <h3 className="font-semibold">{column.name}</h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">
                          {column.tasks.length}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsCreatingTask(column.id)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <Droppable droppableId={column.id} type="task">
                      {(provided, snapshot) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className={`p-2 min-h-96 ${
                            snapshot.isDraggingOver ? 'bg-blue-50' : ''
                          }`}
                        >
                          {column.tasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white rounded-lg p-3 mb-2 shadow-sm border ${
                                    snapshot.isDragging ? 'rotate-2' : ''
                                  } hover:shadow-md transition-all`}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-sm">{task.title}</h4>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => deleteTask(task.id)}
                                    >
                                      <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                  </div>
                                  
                                  {task.description && (
                                    <p className="text-xs text-gray-600 mb-2">
                                      {task.description}
                                    </p>
                                  )}
                                  
                                  {task.subtasks.length > 0 && (
                                    <div className="mb-2">
                                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                        <span>Progress</span>
                                        <span>
                                          {task.subtasks.filter(st => st.completed).length}/
                                          {task.subtasks.length}
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div
                                          className="bg-blue-500 h-1.5 rounded-full"
                                          style={{
                                            width: `${
                                              (task.subtasks.filter(st => st.completed).length /
                                                task.subtasks.length) *
                                              100
                                            }%`
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span className={`px-2 py-1 rounded ${
                                      task.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                                      task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-green-100 text-green-800'
                                    }`}>
                                      {task.priority}
                                    </span>
                                    {task.dueDate && (
                                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}