// src/components/kanban/dialogs/CreateTaskDialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssignableUser } from "@/types/kanban";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetColumnId: string | null;
  assignableMembers: AssignableUser[];
  onCreate: (payload: any) => Promise<void>;
};

export default function CreateTaskDialog({
  open,
  onOpenChange,
  targetColumnId,
  assignableMembers,
  onCreate,
}: Props) {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<
    "LOW" | "MEDIUM" | "HIGH"
  >("MEDIUM");
  const [taskSubtitle, setTaskSubtitle] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("__unassigned__");
  const [dueDate, setDueDate] = useState<string>("");
  const [subtaskInputs, setSubtaskInputs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const close = () => {
    onOpenChange(false);
    setTaskTitle("");
    setTaskPriority("MEDIUM");
    setTaskSubtitle("");
    setAssigneeId("__unassigned__");
    setDueDate("");
    setSubtaskInputs([]);
    setSaving(false);
  };

  const submit = async () => {
    if (!taskTitle.trim() || !targetColumnId) return;
    setSaving(true);
    try {
      const subtasksPayload = subtaskInputs
        .map((t) => t.trim())
        .filter(Boolean)
        .map((title) => ({ title, completed: false }));

      const payload: any = {
        columnId: targetColumnId,
        title: taskTitle.trim(),
        description: taskSubtitle.trim() || undefined,
        priority: taskPriority,
        subtasks: subtasksPayload,
      };
      if (assigneeId && assigneeId !== "__unassigned__")
        payload.assigneeId = assigneeId;
      if (dueDate) payload.dueDate = dueDate;

      await onCreate(payload);
      close();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription className="sr-only">
            Fill in optional details like priority, assignee, due date and
            subtasks.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable form section */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>

          {/* Priority + Due date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={taskPriority}
                onValueChange={(v: "LOW" | "MEDIUM" | "HIGH") =>
                  setTaskPriority(v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Subtitle */}
          <div className="space-y-2">
            <Label htmlFor="task-subtitle">Subtitle</Label>
            <Textarea
              id="task-subtitle"
              rows={2}
              value={taskSubtitle}
              onChange={(e) => setTaskSubtitle(e.target.value)}
              placeholder="Short subtitle (Optional)"
              className="resize-y"
            />
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select value={assigneeId} onValueChange={(v) => setAssigneeId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned__">Unassigned</SelectItem>
                {assignableMembers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {(u.name || u.email) + " (" + u.email + ")"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Subtasks</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSubtaskInputs((prev) => [...prev, ""])}
              >
                + Add subtask
              </Button>
            </div>

            <div className="space-y-2">
              {subtaskInputs.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No subtasks yet.
                </p>
              )}
              {subtaskInputs.map((val, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={val}
                    placeholder={`Subtask #${idx + 1}`}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSubtaskInputs((prev) =>
                        prev.map((p, i) => (i === idx ? v : p))
                      );
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setSubtaskInputs((prev) =>
                        prev.filter((_, i) => i !== idx)
                      )
                    }
                    aria-label="Remove subtask"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !taskTitle.trim()}>
            {saving ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
