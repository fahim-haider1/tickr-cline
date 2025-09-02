// src/types/kanban.ts
export type Subtask = { id: string; title: string; completed: boolean };

export type Task = {
  id: string;
  title: string;
  description?: string | null; // subtitle (short)
  details?: string | null; // long description
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string | Date | null;
  subtasks?: Subtask[];
  assignee?: { id: string; name?: string | null; email: string } | null;
};

export type Column = {
  id: string;
  name: string;
  order: number;
  tasks: Task[];
};

export type Workspace = {
  id: string;
  name: string;
  isPersonal?: boolean;
};

export type WorkspaceUI = Workspace & { undeletable?: boolean };

export type Member = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member" | "viewer";
};

export type AssignableUser = { id: string; name: string | null; email: string };
