// src/components/kanban/dialogs/FilterDialog.tsx
"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Column } from "@/types/kanban";

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  columns: Column[];
  filterColumnId: string;
  setFilterColumnId: (v: string) => void;
  filterPriority: "ANY" | "LOW" | "MEDIUM" | "HIGH";
  setFilterPriority: (v: "ANY" | "LOW" | "MEDIUM" | "HIGH") => void;
  filterDue: "ANY" | "OVERDUE" | "TODAY" | "WEEK" | "NONE";
  setFilterDue: (v: "ANY" | "OVERDUE" | "TODAY" | "WEEK" | "NONE") => void;
  filterCompletion: "ANY" | "COMPLETE" | "INCOMPLETE";
  setFilterCompletion: (v: "ANY" | "COMPLETE" | "INCOMPLETE") => void;
};

export default function FilterDialog({
  open,
  setOpen,
  columns,
  filterColumnId,
  setFilterColumnId,
  filterPriority,
  setFilterPriority,
  filterDue,
  setFilterDue,
  filterCompletion,
  setFilterCompletion,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filter Tasks</DialogTitle>
          <DialogDescription className="sr-only">Filter a single column or all columns by priority, due date and completion.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Column</Label>
            <Select value={filterColumnId} onValueChange={setFilterColumnId}>
              <SelectTrigger>
                <SelectValue placeholder="All columns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All columns</SelectItem>
                {columns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={filterPriority} onValueChange={(v: "ANY" | "LOW" | "MEDIUM" | "HIGH") => setFilterPriority(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Any</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Due date</Label>
            <Select value={filterDue} onValueChange={(v: "ANY" | "OVERDUE" | "TODAY" | "WEEK" | "NONE") => setFilterDue(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Any</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="TODAY">Due today</SelectItem>
                <SelectItem value="WEEK">Due in next 7 days</SelectItem>
                <SelectItem value="NONE">No due date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Completion</Label>
            <Select value={filterCompletion} onValueChange={(v: "ANY" | "COMPLETE" | "INCOMPLETE") => setFilterCompletion(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Any</SelectItem>
                <SelectItem value="COMPLETE">Complete</SelectItem>
                <SelectItem value="INCOMPLETE">Incomplete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => {
              setFilterColumnId("__all__");
              setFilterPriority("ANY");
              setFilterDue("ANY");
              setFilterCompletion("ANY");
              setOpen(false);
            }}
          >
            Reset
          </Button>
          <Button onClick={() => setOpen(false)}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
