// src/lib/kanban-utils.ts
import type { Task } from "@/types/kanban";

export const nameFromEmail = (email: string) => {
  const local = email.split("@")[0].replace(/[._-]+/g, " ");
  return local
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

export const formatDue = (d?: string | Date | null) => {
  if (!d) return null;
  const date = new Date(d as any);
  return isNaN(date.getTime()) ? null : date.toLocaleDateString();
};

export const formatYYYYMMDD = (d?: string | Date | null) => {
  if (!d) return "";
  const date = new Date(d as any);
  if (isNaN(date.getTime())) return "";
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${day}`;
};

export const getPriorityTint = (p: Task["priority"]) =>
  p === "HIGH"
    ? "bg-destructive/15 text-destructive"
    : p === "MEDIUM"
    ? "bg-accent/15 text-accent-foreground"
    : "bg-secondary text-secondary-foreground";

export const isTaskComplete = (task: Task, columnName: string) => {
  const inDoneColumn = columnName.toLowerCase() === "done";
  const hasSubs = (task.subtasks ?? []).length > 0;
  const allSubsDone = hasSubs && (task.subtasks ?? []).every((s) => s.completed);
  return inDoneColumn || allSubsDone;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const isWithinNext7Days = (d: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);
  return d >= today && d <= in7;
};
