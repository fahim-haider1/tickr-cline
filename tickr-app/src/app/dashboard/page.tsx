"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import UserSync from "@/components/UserSync";

import Sidebar from "@/components/kanban/Sidebar";
import HeaderBar from "@/components/kanban/HeaderBar";
import RightSidebar from "@/components/kanban/RightSidebar";
import Column from "@/components/kanban/Column";

import CreateTaskDialog from "@/components/kanban/dialogs/CreateTaskDialog";
import EditTaskDialog from "@/components/kanban/dialogs/EditTaskDialog";
import FilterDialog from "@/components/kanban/dialogs/FilterDialog";

import { Button } from "@/components/ui/button";
import { Filter as FilterIcon, Plus } from "lucide-react";

import {
  createColumn,
  createTaskApi,
  deleteColumnApi,
  fetchAssignableMembers,
  fetchColumns,
  fetchWorkspaces,
  moveTaskApi,
  patchTaskApi,
  patchWorkspace,
  removeWorkspace,
  renameColumnApi,
} from "@/lib/api";

import type {
  AssignableUser,
  Column as ColumnType,
  Member,
  Task,
  Workspace,
  WorkspaceUI,
} from "@/types/kanban";

import {
  isTaskComplete,
  isWithinNext7Days,
  isSameDay,
} from "@/lib/kanban-utils";

import {
  DragDropContext,
  type DropResult,
} from "@hello-pangea/dnd";

// ---------------------------------------------
// Page component
// ---------------------------------------------
export default function DashboardPage() {
  // Layout & UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setSidebarCollapsed((s) => !s);

  const [rightOpen, setRightOpen] = useState(false);
  const openRight = () => setRightOpen(true);
  const closeRight = () => setRightOpen(false);

  // Workspaces & columns
  const [workspaces, setWorkspaces] = useState<WorkspaceUI[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnType[]>([]);

  // Team members (right sidebar, local UI only in this scaffold)
  const [members, setMembers] = useState<Member[]>([]);
  const MAX_MEMBERS = 5;
  const remainingSlots = useMemo(
    () => Math.max(0, MAX_MEMBERS - members.length),
    [members.length]
  );

  // Assignable users (from API)
  const [assignableMembers, setAssignableMembers] = useState<AssignableUser[]>([]);

  // Dialogs & selection
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTargetColumnId, setCreateTargetColumnId] = useState<string | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Filters
  const [filterColumnId, setFilterColumnId] = useState<string>("__all__");
  const [filterPriority, setFilterPriority] = useState<"ANY" | "LOW" | "MEDIUM" | "HIGH">("ANY");
  const [filterDue, setFilterDue] = useState<"ANY" | "OVERDUE" | "TODAY" | "WEEK" | "NONE">("ANY");
  const [filterCompletion, setFilterCompletion] = useState<"ANY" | "COMPLETE" | "INCOMPLETE">("ANY");

  // Derived
  const currentWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);
  const isPersonal = currentWorkspace?.undeletable;

  const activeTask: Task | null = useMemo(() => {
    if (!activeTaskId) return null;
    for (const c of columns) {
      const t = (c.tasks ?? []).find((x) => x.id === activeTaskId);
      if (t) return t;
    }
    return null;
  }, [activeTaskId, columns]);

  // ---------------------- Data loading ----------------------
  const loadWorkspaces = useCallback(async () => {
    const data: Workspace[] = await fetchWorkspaces();
    if (data.length === 0) {
      // Create a personal default workspace if none exist
      await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: "Personal Workspace" }),
      }).catch(() => {});
      const again: Workspace[] = await fetchWorkspaces().catch(() => []);
      setWorkspaces(
        again.map((w) => ({
          ...w,
          undeletable: w.isPersonal || w.name === "Personal Workspace",
        }))
      );
      if (!selectedWorkspaceId && again.length > 0) {
        setSelectedWorkspaceId(again[0].id);
      }
      return;
    }

    setWorkspaces(
      data.map((w) => ({
        ...w,
        undeletable: w.isPersonal || w.name === "Personal Workspace",
      }))
    );
    if (!selectedWorkspaceId && data.length > 0) {
      setSelectedWorkspaceId(data[0].id);
    }
  }, [selectedWorkspaceId]);

  const reloadColumns = useCallback(async (workspaceId: string) => {
    const data = await fetchColumns(workspaceId).catch(() => [] as ColumnType[]);
    setColumns(data);
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (!selectedWorkspaceId) return;

    // columns
    reloadColumns(selectedWorkspaceId);

    // assignable members
    fetchAssignableMembers(selectedWorkspaceId)
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
  }, [selectedWorkspaceId, reloadColumns]);

  // ---------------------- Workspace actions ----------------------
  const addWorkspace = async () => {
    const name = window.prompt("Workspace name?");
    if (!name?.trim()) return;

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

    await loadWorkspaces();
    // Select the last created
    const list: Workspace[] = await fetchWorkspaces();
    const last = list[list.length - 1];
    if (last) setSelectedWorkspaceId(last.id);
  };

  const editWorkspace = async (id: string) => {
    const current = workspaces.find((w) => w.id === id);
    if (!current || current.undeletable) return;
    const name = window.prompt("Rename workspace", current.name);
    if (!name?.trim()) return;
    await patchWorkspace(id, name.trim());
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === id ? { ...w, name: name.trim() } : w))
    );
  };

  const deleteWorkspace = async (id: string) => {
    const current = workspaces.find((w) => w.id === id);
    if (!current || current.undeletable) return;
    const ok = window.confirm("Delete this workspace?");
    if (!ok) return;
    await removeWorkspace(id);
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    if (selectedWorkspaceId === id) {
      setSelectedWorkspaceId((prev) => {
        const rest = workspaces.filter((w) => w.id !== id);
        return rest[0]?.id ?? null;
      });
    }
  };

  // ---------------------- Column actions ----------------------
  const addColumn = async () => {
    if (!selectedWorkspaceId) return;
    const name = window.prompt("Column name?");
    if (!name?.trim()) return;
    const res = await createColumn(selectedWorkspaceId, name.trim());
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`Failed to create column: ${res.status} ${msg || ""}`);
      return;
    }
    await reloadColumns(selectedWorkspaceId);
  };

  const onRenameColumn = async (columnId: string, newName: string) => {
    if (!selectedWorkspaceId) return;
    await renameColumnApi(selectedWorkspaceId, columnId, newName);
    await reloadColumns(selectedWorkspaceId);
  };

  const onDeleteColumn = async (columnId: string) => {
    if (!selectedWorkspaceId) return;
    const ok = window.confirm("Delete this column?");
    if (!ok) return;
    await deleteColumnApi(selectedWorkspaceId, columnId);
    await reloadColumns(selectedWorkspaceId);
  };

  // ---------------------- Task actions ----------------------
  const openTaskDialogFor = (columnId: string) => {
    setCreateTargetColumnId(columnId);
    setCreateOpen(true);
  };

  const onCreateTask = async (payload: any) => {
    await createTaskApi(payload);
    if (selectedWorkspaceId) await reloadColumns(selectedWorkspaceId);
  };

  const onOpenDetails = (task: Task) => {
    setActiveTaskId(task.id);
    setDetailsOpen(true);
  };

  const onDeleteTask = async (taskId: string) => {
    const ok = window.confirm("Delete this task?");
    if (!ok) return;
    await fetch(`/api/tasks/${taskId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (selectedWorkspaceId) await reloadColumns(selectedWorkspaceId);
    if (activeTaskId === taskId) {
      setDetailsOpen(false);
      setActiveTaskId(null);
    }
  };

  const onSaveTask = async (taskId: string, payload: any) => {
    await patchTaskApi(taskId, payload);
    // optimistic local update
    setColumns((prev) =>
      prev.map((c) => ({
        ...c,
        tasks: (c.tasks ?? []).map((t) =>
          t.id !== taskId
            ? t
            : {
                ...t,
                ...(payload.title !== undefined ? { title: payload.title } : {}),
                ...(payload.description !== undefined ? { description: payload.description } : {}),
                ...(payload.dueDate !== undefined
                  ? { dueDate: payload.dueDate ? new Date(payload.dueDate) : null }
                  : {}),
                ...(payload.details !== undefined ? { details: payload.details } : {}),
                ...(payload.assigneeId !== undefined
                  ? {
                      assignee: payload.assigneeId
                        ? assignableMembers.find((m) => m.id === payload.assigneeId) || null
                        : null,
                    }
                  : {}),
              }
        ),
      }))
    );
  };

  const onToggleSubtask = async (taskId: string, subtaskId: string, completed: boolean) => {
    // optimistic
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

  // DnD
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

        // if moved to "Done", mark subtasks complete optimistically
        if (toCol.name.toLowerCase() === "done" && Array.isArray(moved.subtasks)) {
          moved.subtasks = moved.subtasks.map((s) => ({ ...s, completed: true }));
        }
        return copy;
      });

      const res = await moveTaskApi(draggableId, toColId, toIndex);
      if (!res.ok && selectedWorkspaceId) {
        await reloadColumns(selectedWorkspaceId);
      }
    },
    [selectedWorkspaceId, reloadColumns]
  );

  // ---------------------- Filtering ----------------------
  const taskPassesFilters = (task: Task, columnName: string) => {
    // Priority
    if (filterPriority !== "ANY" && task.priority !== filterPriority) return false;

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

  // ---------------------- Render ----------------------
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ensures new users are synced to DB */}
      <UserSync />

      {/* LEFT SIDEBAR */}
      <Sidebar
        collapsed={sidebarCollapsed}
        toggle={toggleSidebar}
        workspaces={workspaces}
        selectedId={selectedWorkspaceId}
        setSelectedId={(id) => setSelectedWorkspaceId(id)}
        addWorkspace={addWorkspace}
        editWorkspace={editWorkspace}
        deleteWorkspace={deleteWorkspace}
      />

      {/* MAIN */}
      <main
        className={`transition-[margin] duration-300 ease-in-out ${
          sidebarCollapsed ? "ml-16" : "ml-64"
        } ${rightOpen ? "mr-80" : "mr-0"}`}
      >
        <HeaderBar
          currentWorkspaceName={currentWorkspace?.name}
          isPersonal={isPersonal}
          openRight={openRight}
        />

        <section className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold mb-2">Welcome Back</h1>
              <p className="text-muted-foreground">
                Here's what's happening with your projects today
              </p>
            </div>
            <div className="flex items-center gap-2">
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

                const tasksToRender: Task[] = shouldFilterThisColumn
                  ? (column.tasks ?? []).filter((t) => taskPassesFilters(t, column.name))
                  : column.tasks ?? [];

                return (
                  <Column
                    key={column.id}
                    column={column}
                    tasksToRender={tasksToRender}
                    onOpenTaskDialogFor={openTaskDialogFor}
                    onDeleteColumn={onDeleteColumn}
                    onOpenDetails={onOpenDetails}
                    onDeleteTask={onDeleteTask}
                    onToggleSubtask={onToggleSubtask}
                    onRenameColumn={onRenameColumn}
                  />
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
      <RightSidebar
        rightOpen={rightOpen}
        isPersonal={!!isPersonal}
        closeRight={closeRight}
        members={members}
        // pass the state setter in functional form to match the prop type
        setMembers={(fn) => setMembers((prev) => fn(prev))}
        remainingSlots={remainingSlots}
      />

      {/* DIALOGS */}
      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        targetColumnId={createTargetColumnId}
        assignableMembers={assignableMembers}
        onCreate={onCreateTask}
      />

      <EditTaskDialog
        open={detailsOpen}
        onOpenChange={(o) => (o ? setDetailsOpen(true) : setDetailsOpen(false))}
        task={activeTask}
        assignableMembers={assignableMembers}
        onSave={onSaveTask}
        onToggleSubtask={onToggleSubtask}
      />

      <FilterDialog
        open={filterOpen}
        setOpen={setFilterOpen}
        columns={columns}
        filterColumnId={filterColumnId}
        setFilterColumnId={setFilterColumnId}
        filterPriority={filterPriority}
        setFilterPriority={setFilterPriority}
        filterDue={filterDue}
        setFilterDue={setFilterDue}
        filterCompletion={filterCompletion}
        setFilterCompletion={setFilterCompletion}
      />
    </div>
  );
}
