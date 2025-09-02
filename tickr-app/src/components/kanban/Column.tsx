// src/components/kanban/Column.tsx
"use client";

import type { Column as ColumnType, Task } from "@/types/kanban";
import TaskCard from "./TaskCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Droppable, Draggable, DroppableProvided, DraggableProvided } from "@hello-pangea/dnd";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type Props = {
  column: ColumnType;
  tasksToRender: Task[];
  onOpenTaskDialogFor: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onOpenDetails: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => void;
  onRenameColumn: (columnId: string, newName: string) => Promise<void>;
};

export default function Column({
  column,
  tasksToRender,
  onOpenTaskDialogFor,
  onDeleteColumn,
  onOpenDetails,
  onDeleteTask,
  onToggleSubtask,
  onRenameColumn,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);

  return (
    <div className="rounded-lg p-4 space-y-4 bg-card border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {editing ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={async () => {
                setEditing(false);
                if (name.trim() && name.trim() !== column.name) {
                  await onRenameColumn(column.id, name.trim());
                }
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  setEditing(false);
                  if (name.trim() && name.trim() !== column.name) {
                    await onRenameColumn(column.id, name.trim());
                  }
                }
              }}
              className="h-7"
              autoFocus
            />
          ) : (
            <span className="text-sm font-medium cursor-pointer" onClick={() => setEditing(true)}>
              {column.name}
            </span>
          )}
          <Badge variant="secondary" className="text-xs">
            {tasksToRender.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onOpenTaskDialogFor(column.id)}
            aria-label="Add task"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-600 h-7 w-7"
            onClick={() => onDeleteColumn(column.id)}
            aria-label="Delete column"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Droppable droppableId={column.id} type="TASK">
        {(dropProvided, dropSnapshot) => (
          <div
            ref={dropProvided.innerRef}
            {...dropProvided.droppableProps}
            className={`space-y-3 min-h-10 pb-1 ${dropSnapshot.isDraggingOver ? "bg-muted/40 rounded-md" : ""}`}
          >
            {tasksToRender.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={dragSnapshot.isDragging ? "opacity-80" : ""}
                  >
                    <TaskCard
                      task={task}
                      columnName={column.name}
                      onOpenDetails={onOpenDetails}
                      onDelete={onDeleteTask}
                      onToggleSubtask={onToggleSubtask}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {dropProvided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
