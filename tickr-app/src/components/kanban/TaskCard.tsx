// src/components/kanban/TaskCard.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Task } from "@/types/kanban";
import { getPriorityTint, formatDue } from "@/lib/kanban-utils";

type Props = {
  task: Task;
  columnName: string;
  onOpenDetails: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => void;
};

export default function TaskCard({ task, columnName, onOpenDetails, onDelete, onToggleSubtask }: Props) {
  const totalSubs = (task.subtasks ?? []).length;
  const doneSubs = (task.subtasks ?? []).filter((s) => s.completed).length;
  const pct = totalSubs ? Math.round((doneSubs / totalSubs) * 100) : 0;
  const dueText = formatDue(task.dueDate);
  const assigneeName = task.assignee?.name?.trim() || task.assignee?.email || "";

  return (
    <div className="relative group">
      <Button
        variant="destructive"
        size="icon"
        className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(task.id);
        }}
        aria-label="Delete task"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <Card className="bg-card border-border cursor-pointer" onClick={() => onOpenDetails(task)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getPriorityTint(task.priority)}`}>
              <span className="inline-block size-1.5 rounded-full bg-current/70" />
              <span className="font-medium">
                {task.priority === "HIGH" ? "High" : task.priority === "MEDIUM" ? "Medium" : "Low"}
              </span>
            </div>
          </div>

          <h3 className="font-medium mb-1">{task.title}</h3>
          {task.description && <p className="text-sm text-muted-foreground mb-3">{task.description}</p>}

          <div className="mb-3">
            {/* Progress colors are handled inside the Progress component's Indicator. */}
            <Progress value={pct} className="h-2 w-full rounded-full" />
            <span className="text-[10px] text-muted-foreground mt-1 block">
              {totalSubs > 0 ? `${doneSubs}/${totalSubs} subtasks` : "No subtasks"}
            </span>
          </div>

          <div className="mt-1 mb-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            {dueText && <span>Due {dueText}</span>}
            {assigneeName && <span>Assigned to {assigneeName}</span>}
          </div>

          <div className="space-y-2">
            {(task.subtasks ?? []).map((sub) => (
              <label
                key={sub.id}
                className="flex items-center gap-2 text-xs cursor-pointer"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Checkbox
                  id={`sub-${task.id}-${sub.id}`}
                  checked={sub.completed}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  onCheckedChange={(val) => onToggleSubtask(task.id, sub.id, Boolean(val))}
                />
                <span className={sub.completed ? "line-through text-primary" : "text-muted-foreground"}>{sub.title}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
