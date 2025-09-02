// src/components/kanban/dialogs/EditTaskDialog.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import type { AssignableUser, Task } from "@/types/kanban";
import { formatYYYYMMDD } from "@/lib/kanban-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  assignableMembers: AssignableUser[];
  onSave: (taskId: string, payload: any) => Promise<void>;
  onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => void;
};

export default function EditTaskDialog({ open, onOpenChange, task, assignableMembers, onSave, onToggleSubtask }: Props) {
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editAssignee, setEditAssignee] = useState<string>("__unassigned__");
  const [editDetails, setEditDetails] = useState("");

  useEffect(() => {
    if (!task) return;
    setEditTitle(task.title ?? "");
    setEditSubtitle(task.description ?? "");
    setEditDue(formatYYYYMMDD(task.dueDate) || "");
    setEditAssignee(task.assignee?.id ?? "__unassigned__");
    setEditDetails(task.details ?? "");
  }, [task]);

  const pct = useMemo(() => {
    if (!task) return 0;
    const total = (task.subtasks ?? []).length;
    const done = (task.subtasks ?? []).filter((s) => s.completed).length;
    return total ? Math.round((done / total) * 100) : 0;
  }, [task]);

  const save = async () => {
    if (!task) return;
    const payload: any = {};
    if (editTitle !== task.title) payload.title = editTitle.trim();
    if ((editSubtitle || "") !== (task.description || "")) payload.description = editSubtitle;
    if ((editDue || "") !== (formatYYYYMMDD(task.dueDate) || "")) payload.dueDate = editDue || null;
    if ((editAssignee === "__unassigned__" ? null : editAssignee) !== (task.assignee?.id ?? null)) {
      payload.assigneeId = editAssignee === "__unassigned__" ? null : editAssignee;
    }
    if ((editDetails || "") !== (task.details || "")) payload.details = editDetails;

    if (Object.keys(payload).length) {
      await onSave(task.id, payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription className="sr-only">View and edit details for this task.</DialogDescription>
        </DialogHeader>

        {task && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Textarea rows={2} value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={editAssignee} onValueChange={(v) => setEditAssignee(v)}>
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

            {(task.subtasks ?? []).length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Progress</Label>
                <Progress value={pct} className="h-2 border border-border rounded-full" />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Subtasks</Label>
              <div className="space-y-2">
                {(task.subtasks ?? []).map((sub) => (
                  <label key={sub.id} className="flex items-center gap-2 text-sm cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={sub.completed}
                      onCheckedChange={(val) => onToggleSubtask(task.id, sub.id, Boolean(val))}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className={sub.completed ? "line-through text-primary" : "text-muted-foreground"}>{sub.title}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={4} value={editDetails} onChange={(e) => setEditDetails(e.target.value)} placeholder="Add a detailed description…" />
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={save} disabled={!task}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
