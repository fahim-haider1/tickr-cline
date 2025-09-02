// src/lib/api.ts
import type { Column, Workspace } from "@/types/kanban";

const j = (r: Response) => (r.ok ? r.json() : Promise.reject(r));

export const fetchWorkspaces = () =>
  fetch("/api/workspaces", { cache: "no-store", credentials: "include" }).then(j);

export const createWorkspace = (name: string) =>
  fetch("/api/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name }),
  });

export const patchWorkspace = (id: string, name: string) =>
  fetch(`/api/workspaces/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name }),
  });

export const removeWorkspace = (id: string) =>
  fetch(`/api/workspaces/${id}`, { method: "DELETE", credentials: "include" });

export const fetchColumns = (workspaceId: string): Promise<Column[]> =>
  fetch(`/api/workspaces/${workspaceId}/columns`, {
    cache: "no-store",
    credentials: "include",
  }).then(j);

export const createColumn = (workspaceId: string, name: string) =>
  fetch(`/api/workspaces/${workspaceId}/columns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name }),
  });

export const renameColumnApi = (workspaceId: string, columnId: string, name: string) =>
  fetch(`/api/workspaces/${workspaceId}/columns`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ columnId, name }),
  });

export const deleteColumnApi = (workspaceId: string, columnId: string) =>
  fetch(`/api/workspaces/${workspaceId}/columns?columnId=${columnId}`, {
    method: "DELETE",
    credentials: "include",
  });

export const moveTaskApi = (taskId: string, toColumnId: string, toIndex: number) =>
  fetch("/api/tasks/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ taskId, toColumnId, toIndex }),
  });

export const createTaskApi = (payload: any) =>
  fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

export const patchTaskApi = (taskId: string, payload: any) =>
  fetch(`/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

export const toggleSubtaskApi = (subtaskId: string, completed: boolean) =>
  fetch(`/api/subtasks/${subtaskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ completed }),
  });

export const fetchAssignableMembers = (workspaceId: string) =>
  fetch(`/api/workspaces/${workspaceId}/members`, {
    cache: "no-store",
    credentials: "include",
  }).then((r) => (r.ok ? r.json() : [])) as Promise<any[]>;
