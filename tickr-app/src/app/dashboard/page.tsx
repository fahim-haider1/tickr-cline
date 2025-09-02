// src/app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import UserSync from "@/components/UserSync";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  ChevronRight,
  Users,
  LogOut,
  MoreVertical,
  PencilLine,
  Trash2,
  Check,
  X,
  Minus,
  Filter as FilterIcon,
} from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

// shadcn progress bar
import { Progress } from "@/components/ui/progress";

// ----------------- Types -----------------
type Subtask = { id: string; title: string; completed: boolean };

type Task = {
  id: string;
  title: string;
  description?: string | null; // subtitle (short)
  details?: string | null; // long description (separate)
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string | Date | null;
  subtasks?: Subtask[];
  assignee?: { id: string; name?: string | null; email: string } | null;
};

type Column = {
  id: string;
  name: string;
  order: number;
  tasks: Task[];
};

type Workspace = {
  id: string;
  name: string;
  isPersonal?: boolean;
};
type WorkspaceUI = Workspace & { undeletable?: boolean };

type Member = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member" | "viewer";
};

type AssignableUser = { id: string; name: string | null; email: string };

// ------------------------------------------------------------------------------------------

export default function KanbanBoard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setSidebarCollapsed((s) => !s);

  const [workspaces, setWorkspaces] = useState<WorkspaceUI[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null
  );
  const [columns, setColumns] = useState<Column[]>([]);

  const [rightOpen, setRightOpen] = useState(false);
  const openRight = () => setRightOpen(true);
  const closeRight = () => setRightOpen(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">(
    "member"
  );

  const [members, setMembers] = useState<Member[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");

  // ---------------- Task dialog state (create) ----------------
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskTargetColumnId, setTaskTargetColumnId] = useState<string | null>(
    null
  );
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH">(
    "MEDIUM"
  );
  const [taskSubtitle, setTaskSubtitle] = useState(""); // stored as description
  const [assigneeId, setAssigneeId] = useState<string>("__unassigned__");
  const [dueDate, setDueDate] = useState<string>("");
  const [subtaskInputs, setSubtaskInputs] = useState<string[]>([]);
  const [taskSaving, setTaskSaving] = useState(false);
  const [assignableMembers, setAssignableMembers] = useState<AssignableUser[]>(
    []
  );
  // ------------------------------------------------------------

  // column rename state
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColumnName, setEditColumnName] = useState<string>("");

  // ---------- Task details/edit dialog (click card) ----------
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const activeTask = useMemo(() => {
    if (!activeTaskId) return null;
    for (const c of columns) {
      const t = (c.tasks ?? []).find((x) => x.id === activeTaskId);
      if (t) return t;
    }
    return null;
  }, [activeTaskId, columns]);

  // local edit fields in dialog
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editAssignee, setEditAssignee] = useState<string>("__unassigned__");
  const [editDetails, setEditDetails] = useState("");

  const openDetails = (task: Task) => {
    setActiveTaskId(task.id);
    setDetailsOpen(true);
  };
  const closeDetails = () => {
    setDetailsOpen(false);
    setActiveTaskId(null);
  };

  // preload fields when dialog opens or active task changes
  useEffect(() => {
    if (!activeTask) return;
    setEditTitle(activeTask.title ?? "");
    setEditSubtitle(activeTask.description ?? "");
    setEditDue(formatYYYYMMDD(activeTask.dueDate) || "");
    setEditAssignee(activeTask.assignee?.id ?? "__unassigned__");
    setEditDetails(activeTask.details ?? "");
  }, [activeTask]);

  // ---------------- Helpers ----------------
  const MAX_MEMBERS = 5;
  const remainingSlots = useMemo(
    () => Math.max(0, MAX_MEMBERS - members.length),
    [members.length]
  );
  const atCapacity = remainingSlots === 0;

  const nameFromEmail = (email: string) => {
    const local = email.split("@")[0].replace(/[._-]+/g, " ");
    return local
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const formatDue = (d?: string | Date | null) => {
    if (!d) return null;
    const date = new Date(d as any);
    return isNaN(date.getTime()) ? null : date.toLocaleDateString();
  };

  const formatYYYYMMDD = (d?: string | Date | null) => {
    if (!d) return "";
    const date = new Date(d as any);
    if (isNaN(date.getTime())) return "";
    const m = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${date.getFullYear()}-${m}-${day}`;
  };

  const getPriorityTint = (p: Task["priority"]) =>
    p === "HIGH"
      ? "bg-destructive/15 text-destructive"
      : p === "MEDIUM"
      ? "bg-accent/15 text-accent-foreground"
      : "bg-secondary text-secondary-foreground";

  const isTaskComplete = (task: Task, columnName: string) => {
    const inDoneColumn = columnName.toLowerCase() === "done";
    const hasSubs = (task.subtasks ?? []).length > 0;
    const allSubsDone =
      hasSubs && (task.subtasks ?? []).every((s) => s.completed);
    return inDoneColumn || allSubsDone;
  };

  // patch helper
  const patchTask = async (taskId: string, data: any) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
  };

  // ---------------- Members load (assignable) ----------------
  useEffect(() => {
    if (!selectedWorkspaceId) return;
    fetch(`/api/workspaces/${selectedWorkspaceId}/members`, {
      cache: "no-store",
      credentials: "include",
    })
      .then(async (r) => (r.ok ? r.json() : []))
      .then((list: any[]) => {
        const users: AssignableUser[] = Array.isArray(list)
          ? list
              .map((m) => ({
                id: m?.user?.id,
                name: m?.user?.name ?? null,
                email: m?.user?.email ?? "",
              }))
              .filter((u) => !!u.id && !!u.email)
          : [];
        setAssignableMembers(users);
      })
      .catch(() => setAssignableMembers([]));
  }, [selectedWorkspaceId]);

  // ---------------- Workspaces + Columns load ----------------
  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/workspaces", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) return;
      const data: Workspace[] = await res.json();

      if (data.length === 0) {
        const created = await fetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: "Personal Workspace" }),
        });
        if (created.ok) {
          const again = await fetch("/api/workspaces", {
            cache: "no-store",
            credentials: "include",
          });
          const list: Workspace[] = again.ok ? await again.json() : [];
          setWorkspaces(
            list.map((w) => ({
              ...w,
              undeletable: w.isPersonal || w.name === "Personal Workspace",
            }))
          );
          if (!selectedWorkspaceId && list.length > 0)
            setSelectedWorkspaceId(list[0].id);
          return;
        }
      }

      setWorkspaces(
        data.map((w) => ({
          ...w,
          undeletable: w.isPersonal || w.name === "Personal Workspace",
        }))
      );
      if (!selectedWorkspaceId && data.length > 0)
        setSelectedWorkspaceId(data[0].id);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadColumns = async (workspaceId: string) => {
    const res = await fetch(`/api/workspaces/${workspaceId}/columns`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) {
      setColumns([]);
      return;
    }
    const data: Column[] = await res.json();
    setColumns(data);
  };

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    reloadColumns(selectedWorkspaceId);
  }, [selectedWorkspaceId]);

  // ---------------- Workspace actions ----------------
  const addWorkspace = async () => {
    const name = window.prompt("Workspace name?");
    if (!name) return;

    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: name.trim() }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`Failed to create workspace: ${res.status} ${msg || ""}`);
      return;
    }

    const again = await fetch("/api/workspaces", {
      cache: "no-store",
      credentials: "include",
    });
    if (!again.ok) return;
    const list: Workspace[] = await again.json();

    setWorkspaces(
      list.map((w) => ({
        ...w,
        undeletable: w.isPersonal || w.name === "Personal Workspace",
      }))
    );

    const last = list[list.length - 1];
    if (last) setSelectedWorkspaceId(last.id);
  };

  const editWorkspace = async (id: string) => {
    const current = workspaces.find((w) => w.id === id);
    if (!current || current.undeletable) return;
    const name = window.prompt("Rename workspace", current.name);
    if (!name) return;
    const res = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) {
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === id ? { ...w, name: name.trim() } : w))
      );
    }
  };

  const deleteWorkspace = async (id: string) => {
    const current = workspaces.find((w) => w.id === id);
    if (!current || current.undeletable) return;
    const ok = window.confirm("Delete this workspace?");
    if (!ok) return;
    const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
    if (res.ok) {
      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
      if (selectedWorkspaceId === id)
        setSelectedWorkspaceId(workspaces[0]?.id ?? null);
    }
  };

  const isPersonal = workspaces.find(
    (w) => w.id === selectedWorkspaceId
  )?.undeletable;

  // ---------------- Column actions ----------------
  const addColumn = async () => {
    if (!selectedWorkspaceId) return;
    const name = window.prompt("Column name?");
    if (!name?.trim()) return;
    const res = await fetch(`/api/workspaces/${selectedWorkspaceId}/columns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: name.trim() }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`Failed to create column: ${res.status} ${msg || ""}`);
      return;
    }
    reloadColumns(selectedWorkspaceId);
  };

  async function renameColumn(columnId: string, name: string) {
    if (!selectedWorkspaceId || !name.trim()) {
      setEditingColumnId(null);
      return;
    }
    await fetch(`/api/workspaces/${selectedWorkspaceId}/columns`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId, name }),
    });
    await reloadColumns(selectedWorkspaceId);
    setEditingColumnId(null);
  }

  async function deleteColumn(columnId: string) {
    if (!selectedWorkspaceId) return;
    const ok = window.confirm("Delete this column?");
    if (!ok) return;
    await fetch(
      `/api/workspaces/${selectedWorkspaceId}/columns?columnId=${columnId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    await reloadColumns(selectedWorkspaceId);
  }

  // ---------------- Create Task ----------------
  const openTaskDialogFor = (columnId: string) => {
    setTaskTargetColumnId(columnId);
    setTaskTitle("");
    setTaskPriority("MEDIUM");
    setTaskSubtitle("");
    setAssigneeId("__unassigned__");
    setDueDate("");
    setSubtaskInputs([]);
    setTaskDialogOpen(true);
  };
  const closeTaskDialog = () => {
    setTaskDialogOpen(false);
    setTaskTargetColumnId(null);
  };

  const createTask = async () => {
    if (!taskTitle.trim() || !taskTargetColumnId || !selectedWorkspaceId)
      return;
    setTaskSaving(true);
    try {
      const subtasksPayload = subtaskInputs
        .map((t) => t.trim())
        .filter(Boolean)
        .map((title) => ({ title, completed: false }));

      const body: any = {
        columnId: taskTargetColumnId,
        title: taskTitle.trim(),
        description: taskSubtitle.trim() || undefined,
        priority: taskPriority,
        subtasks: subtasksPayload,
      };
      if (assigneeId && assigneeId !== "__unassigned__") {
        body.assigneeId = assigneeId;
      }
      if (dueDate) body.dueDate = dueDate;

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        alert(`Failed to create task: ${res.status} ${msg || ""}`);
        return;
      }
      await reloadColumns(selectedWorkspaceId);
      closeTaskDialog();
    } finally {
      setTaskSaving(false);
    }
  };

  // ---------------- DnD + Subtasks ----------------
  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;

      const fromColId = source.droppableId;
      const toColId = destination.droppableId;
      const fromIndex = source.index;
      const toIndex = destination.index;

      if (fromColId === toColId && fromIndex === toIndex) return;

      setColumns((prev) => {
        const copy = prev.map((c) => ({ ...c, tasks: [...(c.tasks ?? [])] }));
        const fromCol = copy.find((c) => c.id === fromColId);
        const toCol = copy.find((c) => c.id === toColId);
        if (!fromCol || !toCol) return prev;

        const [moved] = fromCol.tasks.splice(fromIndex, 1);
        if (!moved) return prev;
        toCol.tasks.splice(toIndex, 0, moved);

        // optimistic: moved to "Done" -> mark all subtasks complete locally
        if (
          toCol.name.toLowerCase() === "done" &&
          Array.isArray(moved.subtasks)
        ) {
          moved.subtasks = moved.subtasks.map((s) => ({
            ...s,
            completed: true,
          }));
        }

        return copy;
      });

      const res = await fetch("/api/tasks/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          taskId: draggableId,
          toColumnId: toColId,
          toIndex,
        }),
      });

      if (!res.ok && selectedWorkspaceId) {
        await reloadColumns(selectedWorkspaceId);
      }
    },
    [selectedWorkspaceId]
  );

  const toggleSubtask = async (
    taskId: string,
    subtaskId: string,
    completed: boolean
  ) => {
    // optimistic UI
    setColumns((prev) =>
      prev.map((c) => ({
        ...c,
        tasks: (c.tasks ?? []).map((t) =>
          t.id !== taskId
            ? t
            : {
                ...t,
                subtasks: (t.subtasks ?? []).map((s) =>
                  s.id === subtaskId ? { ...s, completed } : s
                ),
              }
        ),
      }))
    );

    try {
      await fetch(`/api/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ completed }),
      });
    } catch {
      if (selectedWorkspaceId) await reloadColumns(selectedWorkspaceId);
    }
  };

  // ------- Delete a task (hover button & optional from dialog close) -------
  const deleteTask = async (taskId: string) => {
    const ok = window.confirm("Delete this task?");
    if (!ok) return;
    await fetch(`/api/tasks/${taskId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (selectedWorkspaceId) await reloadColumns(selectedWorkspaceId);
    if (activeTaskId === taskId) closeDetails();
  };

  // ------- Sidebar edit handlers to avoid runtime errors -------
  const saveEdit = (id: string) => {
    setMembers((prev) =>
      prev.map((pm) =>
        pm.id === id ? { ...pm, name: editName.trim() || pm.name } : pm
      )
    );
    setEditingId(null);
    setEditName("");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  // ---------------- Filters ----------------
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterColumnId, setFilterColumnId] = useState<string>("__all__");
  const [filterPriority, setFilterPriority] = useState<
    "ANY" | "LOW" | "MEDIUM" | "HIGH"
  >("ANY");
  const [filterDue, setFilterDue] = useState<
    "ANY" | "OVERDUE" | "TODAY" | "WEEK" | "NONE"
  >("ANY");
  const [filterCompletion, setFilterCompletion] = useState<
    "ANY" | "COMPLETE" | "INCOMPLETE"
  >("ANY");

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isWithinNext7Days = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7 = new Date(today);
    in7.setDate(in7.getDate() + 7);
    return d >= today && d <= in7;
  };

  const taskPassesFilters = (task: Task, columnName: string) => {
    // Priority
    if (filterPriority !== "ANY" && task.priority !== filterPriority)
      return false;

    // Due date
    const rawDue = task.dueDate as any;
    const due = rawDue ? new Date(rawDue) : null;
    if (filterDue === "OVERDUE") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!due || due >= today) return false;
    } else if (filterDue === "TODAY") {
      if (!due || !isSameDay(due, new Date())) return false;
    } else if (filterDue === "WEEK") {
      if (!due || !isWithinNext7Days(due)) return false;
    } else if (filterDue === "NONE") {
      if (due) return false;
    }

    // Completion
    if (filterCompletion !== "ANY") {
      const complete = isTaskComplete(task, columnName);
      if (filterCompletion === "COMPLETE" && !complete) return false;
      if (filterCompletion === "INCOMPLETE" && complete) return false;
    }

    return true;
  };

  // ---------------- Render ----------------
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ensure new users are synced to DB */}
      <UserSync />

      {/* LEFT SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border
        transition-[width] duration-300 ease-in-out ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="h-full flex flex-col p-4 gap-4">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <span className="text-base font-semibold mx-auto">
                Workspaces...
              </span>
            )}
            <button
              onClick={toggleSidebar}
              className="p-1 rounded hover:bg-sidebar/50 transition"
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4 rotate-180" />
              )}
            </button>
          </div>

          <div className="space-y-1 overflow-y-auto">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-sidebar/60 cursor-pointer ${
                  selectedWorkspaceId === ws.id
                    ? "bg-sidebar/70 ring-1 ring-sidebar-border/50"
                    : ""
                }`}
                onClick={() => setSelectedWorkspaceId(ws.id)}
              >
                {!sidebarCollapsed && (
                  <span className="truncate">{ws.name}</span>
                )}
                {!ws.undeletable && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-2"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          editWorkspace(ws.id);
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteWorkspace(ws.id);
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}

            <Button
              onClick={addWorkspace}
              className="mt-2 w-full bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90"
            >
              {!sidebarCollapsed ? (
                "Add New Workspace"
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main
        className={`transition-[margin] duration-300 ease-in-out ${
          sidebarCollapsed ? "ml-16" : "ml-64"
        } ${rightOpen ? "mr-80" : "mr-0"}`}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/60 backdrop-blur">
          <div className="flex items-center">
            <img src="/Group 5 (2).svg" alt="Tickr" className="h-6 w-auto" />
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" className="hidden sm:inline-flex">
              Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-primary" />
              <span className="text-sm">
                {workspaces.find((w) => w.id === selectedWorkspaceId)?.name ??
                  "—"}
              </span>
            </div>
            {!isPersonal && (
              <Users
                className="w-5 h-5 opacity-70 cursor-pointer"
                onClick={openRight}
              />
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="w-8 h-8 cursor-pointer">
                  <AvatarFallback className="bg-muted text-foreground/80 text-xs">
                    U
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <SignOutButton redirectUrl="/sign-in">
                  <DropdownMenuItem className="cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </SignOutButton>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <section className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold mb-2">Welcome Back</h1>
              <p className="text-muted-foreground">
                Here's what's happening with your projects today
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Filter button */}
              <Button variant="outline" onClick={() => setFilterOpen(true)}>
                <FilterIcon className="w-4 h-4 mr-2" />
                Filter
              </Button>

              <Button
                className="bg-primary text-primary-foreground hover:opacity-90"
                onClick={addColumn}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Column
              </Button>
            </div>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {columns.map((column) => {
                const shouldFilterThisColumn =
                  filterColumnId === "__all__" || filterColumnId === column.id;

                const tasksToRender = shouldFilterThisColumn
                  ? (column.tasks ?? []).filter((t) =>
                      taskPassesFilters(t, column.name)
                    )
                  : column.tasks ?? [];

                return (
                  <div
                    key={column.id}
                    className="rounded-lg p-4 space-y-4 bg-card border border-border"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {editingColumnId === column.id ? (
                          <Input
                            value={editColumnName}
                            onChange={(e) => setEditColumnName(e.target.value)}
                            onBlur={() =>
                              renameColumn(column.id, editColumnName)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                renameColumn(column.id, editColumnName);
                            }}
                            className="h-7"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="text-sm font-medium cursor-pointer"
                            onClick={() => {
                              setEditingColumnId(column.id);
                              setEditColumnName(column.name);
                            }}
                          >
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
                          onClick={() => openTaskDialogFor(column.id)}
                          aria-label="Add task"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 h-7 w-7"
                          onClick={() => deleteColumn(column.id)}
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
                          className={`space-y-3 min-h-10 pb-1 ${
                            dropSnapshot.isDraggingOver
                              ? "bg-muted/40 rounded-md"
                              : ""
                          }`}
                        >
                          {tasksToRender.map((task, index) => {
                            const totalSubs = (task.subtasks ?? []).length;
                            const doneSubs = (task.subtasks ?? []).filter(
                              (s) => s.completed
                            ).length;
                            const pct = totalSubs
                              ? Math.round((doneSubs / totalSubs) * 100)
                              : 0;
                            const dueText = formatDue(task.dueDate);
                            const assigneeName =
                              task.assignee?.name?.trim() ||
                              task.assignee?.email ||
                              "";

                            return (
                              <Draggable
                                key={task.id}
                                draggableId={task.id}
                                index={index}
                              >
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    className={
                                      dragSnapshot.isDragging
                                        ? "opacity-80"
                                        : ""
                                    }
                                  >
                                    {/* group wrapper for hover-only delete */}
                                    <div className="relative group">
                                      {/* Hover-only delete button (top-right) */}
                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteTask(task.id);
                                        }}
                                        aria-label="Delete task"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>

                                      <Card
                                        className="bg-card border-border cursor-pointer"
                                        onClick={() => openDetails(task)}
                                      >
                                        <CardContent className="p-4">
                                          <div className="flex items-center gap-2 mb-3">
                                            <div
                                              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getPriorityTint(
                                                task.priority
                                              )}`}
                                            >
                                              <span className="inline-block size-1.5 rounded-full bg-current/70" />
                                              <span className="font-medium">
                                                {task.priority === "HIGH"
                                                  ? "High"
                                                  : task.priority === "MEDIUM"
                                                  ? "Medium"
                                                  : "Low"}
                                              </span>
                                            </div>
                                          </div>

                                          <h3 className="font-medium mb-1">
                                            {task.title}
                                          </h3>
                                          {task.description && (
                                            <p className="text-sm text-muted-foreground mb-3">
                                              {task.description}
                                            </p>
                                          )}

                                          {/* Progress bar (always visible) */}

                                          <div className="mb-3">
                                            <Progress
                                              value={pct}
                                              className={`h-2 w-full rounded-full ${
                                                pct === 100
                                                  ? "bg-success"
                                                  : "bg-primary"
                                              }`}
                                            />
                                            <span className="text-[10px] text-muted-foreground mt-1 block">
                                              {totalSubs > 0
                                                ? `${doneSubs}/${totalSubs} subtasks`
                                                : "No subtasks"}
                                            </span>
                                          </div>

                                          {/* Due date + Assignee inline on the card */}
                                          <div className="mt-1 mb-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                                            {dueText && (
                                              <span>Due {dueText}</span>
                                            )}
                                            {assigneeName && (
                                              <span>
                                                Assigned to {assigneeName}
                                              </span>
                                            )}
                                          </div>

                                          <div className="space-y-2">
                                            {(task.subtasks ?? []).map(
                                              (sub) => (
                                                <label
                                                  key={sub.id}
                                                  className="flex items-center gap-2 text-xs cursor-pointer"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                  onMouseDown={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                >
                                                  <Checkbox
                                                    id={`sub-${task.id}-${sub.id}`}
                                                    checked={sub.completed}
                                                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                    onCheckedChange={(val) =>
                                                      toggleSubtask(
                                                        task.id,
                                                        sub.id,
                                                        Boolean(val)
                                                      )
                                                    }
                                                  />
                                                  <span
                                                    className={
                                                      sub.completed
                                                        ? "line-through text-primary"
                                                        : "text-muted-foreground"
                                                    }
                                                  >
                                                    {sub.title}
                                                  </span>
                                                </label>
                                              )
                                            )}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {dropProvided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}

              {columns.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No columns yet. Use “Add Column” to create one.
                </div>
              )}
            </div>
          </DragDropContext>
        </section>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside
        className={[
          "fixed inset-y-0 right-0 bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out overflow-hidden",
          rightOpen ? "w-80 border-l border-sidebar-border" : "w-0 border-l-0",
          isPersonal ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <div className="h-full flex flex-col p-4 gap-4">
          {rightOpen && (
            <div className="flex items-center justify-between">
              <button
                onClick={closeRight}
                className="p-1 rounded hover:bg-sidebar/50 transition"
                aria-label="Collapse secondary sidebar"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <span className="text-base font-semibold mx-auto">
                Team Members
              </span>
              <div className="w-6" />
            </div>
          )}

          {rightOpen ? (
            <div className="flex-1 overflow-y-auto space-y-4">
              {members.length > 0 && (
                <div className="space-y-3">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-start gap-3">
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground/70 text-xs">
                        {m.name
                          ? m.name[0]?.toUpperCase()
                          : m.email[0]?.toUpperCase()}
                      </div>

                      <div className="flex-1">
                        {editingId === m.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8"
                            />
                            <Button
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => saveEdit(m.id)}
                              aria-label="Save"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={cancelEdit}
                              aria-label="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">{m.name}</div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingId(m.id)}
                              aria-label="Edit name"
                            >
                              <PencilLine className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          {m.email}
                        </div>

                        <div className="mt-2 max-w-[180px]">
                          <Select
                            value={m.role}
                            onValueChange={(v: "admin" | "member" | "viewer") =>
                              setMembers((prev) =>
                                prev.map((pm) =>
                                  pm.id === m.id ? { ...pm, role: v } : pm
                                )
                              )
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setMembers((prev) =>
                            prev.filter((pm) => pm.id !== m.id)
                          )
                        }
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Card className="bg-card border-border max-w-sm">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm">Add New Member</CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    {atCapacity
                      ? "Member slots are full."
                      : `You can add ${remainingSlots} more ${
                          remainingSlots === 1 ? "member" : "members"
                        } in this team.`}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-email" className="text-xs">
                      Enter email address
                    </Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="name@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={atCapacity}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Select Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v: "admin" | "member" | "viewer") =>
                        setInviteRole(v)
                      }
                      disabled={atCapacity}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full bg-primary text-primary-foreground h-9"
                    onClick={() => {
                      const email = inviteEmail.trim().toLowerCase();
                      if (!email || atCapacity) return;
                      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
                      if (members.some((m) => m.email === email)) return;
                      setMembers((prev) => [
                        ...prev,
                        {
                          id: crypto.randomUUID(),
                          email,
                          name: nameFromEmail(email),
                          role: inviteRole,
                        },
                      ]);
                      setInviteEmail("");
                      setInviteRole("member");
                    }}
                    disabled={atCapacity}
                  >
                    Send Invite
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </aside>

      {/* ------------------- CREATE TASK DIALOG ------------------- */}
      <Dialog
        open={taskDialogOpen}
        onOpenChange={(open) =>
          open ? setTaskDialogOpen(true) : closeTaskDialog()
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription className="sr-only">
              Fill in optional details like priority, assignee, due date and
              subtasks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title (required) */}
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

            {/* Subtitle (description) */}
            <div className="space-y-2">
              <Label htmlFor="task-subtitle">Subtitle</Label>
              <Textarea
                id="task-subtitle"
                rows={2}
                value={taskSubtitle}
                onChange={(e) => setTaskSubtitle(e.target.value)}
                placeholder="Short subtitle (Optional)"
              />
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={assigneeId}
                onValueChange={(v) => setAssigneeId(v)}
              >
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
                  <Plus className="w-4 h-4 mr-1" />
                  Add subtask
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
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeTaskDialog}>
              Cancel
            </Button>
            <Button
              onClick={createTask}
              disabled={taskSaving || !taskTitle.trim()}
            >
              {taskSaving ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ------------------- /CREATE TASK DIALOG ------------------- */}

      {/* ------------------- TASK DETAILS/EDIT DIALOG (click card) ------------------- */}
      <Dialog
        open={detailsOpen}
        onOpenChange={(o) => (o ? setDetailsOpen(true) : closeDetails())}
      >
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription className="sr-only">
              View and edit details for this task.
            </DialogDescription>
          </DialogHeader>

          {activeTask && (
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              {/* Subtitle + Due date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Textarea
                    rows={2}
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due date</Label>
                  <Input
                    type="date"
                    value={editDue}
                    onChange={(e) => setEditDue(e.target.value)}
                  />
                </div>
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select
                  value={editAssignee}
                  onValueChange={(v) => setEditAssignee(v)}
                >
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

              {/* Progress (read-only) */}
              {(activeTask.subtasks ?? []).length > 0 &&
                (() => {
                  const total = (activeTask.subtasks ?? []).length;
                  const done = (activeTask.subtasks ?? []).filter(
                    (s) => s.completed
                  ).length;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <div className="space-y-1">
                      <Label className="text-xs">Progress</Label>
                      <Progress
                        value={pct}
                        className="h-2 border border-border rounded-full"
                      />
                    </div>
                  );
                })()}

              {/* Subtasks (don’t close/trigger card) */}
              <div className="space-y-1">
                <Label className="text-xs">Subtasks</Label>
                <div className="space-y-2">
                  {(activeTask.subtasks ?? []).map((sub) => (
                    <label
                      key={sub.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={sub.completed}
                        onCheckedChange={(val) =>
                          toggleSubtask(activeTask.id, sub.id, Boolean(val))
                        }
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span
                        className={
                          sub.completed
                            ? "line-through text-primary"
                            : "text-muted-foreground"
                        }
                      >
                        {sub.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Separate long Description (details) */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={4}
                  value={editDetails}
                  onChange={(e) => setEditDetails(e.target.value)}
                  placeholder="Add a detailed description…"
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeDetails}>
              Close
            </Button>
            <Button
              onClick={async () => {
                if (!activeTask) return;

                // Create payload with only changed fields
                const payload: any = {};
                if (editTitle !== activeTask.title)
                  payload.title = editTitle.trim();
                if ((editSubtitle || "") !== (activeTask.description || ""))
                  payload.description = editSubtitle;
                if (
                  (editDue || "") !== (formatYYYYMMDD(activeTask.dueDate) || "")
                )
                  payload.dueDate = editDue || null;
                if (
                  (editAssignee === "__unassigned__" ? null : editAssignee) !==
                  (activeTask.assignee?.id ?? null)
                ) {
                  payload.assigneeId =
                    editAssignee === "__unassigned__" ? null : editAssignee;
                }
                if ((editDetails || "") !== (activeTask.details || ""))
                  payload.details = editDetails;

                if (Object.keys(payload).length) {
                  await patchTask(activeTask.id, payload);
                  // optimistic local update
                  setColumns((prev) =>
                    prev.map((c) => ({
                      ...c,
                      tasks: (c.tasks ?? []).map((t) =>
                        t.id !== activeTask.id
                          ? t
                          : {
                              ...t,
                              ...(payload.title !== undefined
                                ? { title: payload.title }
                                : {}),
                              ...(payload.description !== undefined
                                ? { description: payload.description }
                                : {}),
                              ...(payload.dueDate !== undefined
                                ? {
                                    dueDate: payload.dueDate
                                      ? new Date(payload.dueDate)
                                      : null,
                                  }
                                : {}),
                              ...(payload.details !== undefined
                                ? { details: payload.details }
                                : {}),
                              ...(payload.assigneeId !== undefined
                                ? {
                                    assignee: payload.assigneeId
                                      ? assignableMembers.find(
                                          (m) => m.id === payload.assigneeId
                                        ) || null
                                      : null,
                                  }
                                : {}),
                            }
                      ),
                    }))
                  );
                }

                closeDetails();
              }}
              disabled={!activeTask}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ------------------- /TASK DETAILS/EDIT DIALOG ------------------- */}

      {/* ------------------- FILTER DIALOG ------------------- */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Tasks</DialogTitle>
            <DialogDescription className="sr-only">
              Filter a single column or all columns by priority, due date and
              completion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Column */}
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

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={filterPriority}
                onValueChange={(v: "ANY" | "LOW" | "MEDIUM" | "HIGH") =>
                  setFilterPriority(v)
                }
              >
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

            {/* Due date */}
            <div className="space-y-2">
              <Label>Due date</Label>
              <Select
                value={filterDue}
                onValueChange={(
                  v: "ANY" | "OVERDUE" | "TODAY" | "WEEK" | "NONE"
                ) => setFilterDue(v)}
              >
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

            {/* Completion */}
            <div className="space-y-2">
              <Label>Completion</Label>
              <Select
                value={filterCompletion}
                onValueChange={(v: "ANY" | "COMPLETE" | "INCOMPLETE") =>
                  setFilterCompletion(v)
                }
              >
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
                setFilterOpen(false);
              }}
            >
              Reset
            </Button>
            <Button onClick={() => setFilterOpen(false)}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ------------------- /FILTER DIALOG ------------------- */}
    </div>
  );
}
