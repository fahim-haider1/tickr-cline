"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
} from "lucide-react"
import { SignOutButton } from "@clerk/nextjs"

// ➕ dialog imports (kept)
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

/* ➕ NEW: drag & drop */
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd"

// ---- DB-backed types ----
type Subtask = { id: string; title: string; completed: boolean }
type Task = {
  id: string
  title: string
  description?: string | null
  priority: "LOW" | "MEDIUM" | "HIGH"
  subtasks?: Subtask[]
}
type Column = {
  id: string
  name: string
  order: number
  tasks: Task[]
}

type Workspace = {
  id: string
  name: string
  isPersonal?: boolean
}
type WorkspaceUI = Workspace & { undeletable?: boolean }

type Member = {
  id: string
  name: string
  email: string
  role: "admin" | "member" | "viewer"
}

export default function KanbanBoard() {
  // ----- Primary sidebar -----
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const toggleSidebar = () => setSidebarCollapsed((s) => !s)

  // ----- Workspaces (via API) -----
  const [workspaces, setWorkspaces] = useState<WorkspaceUI[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)

  // ----- Columns/Tasks (DB) -----
  const [columns, setColumns] = useState<Column[]>([])

  // ----- Secondary sidebar -----
  const [rightOpen, setRightOpen] = useState(false)
  const openRight = () => setRightOpen(true)
  const closeRight = () => setRightOpen(false)

  // ----- Invite form -----
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member")

  // ----- Members list -----
  const [members, setMembers] = useState<Member[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState<string>("")

  // ➕ Task dialog state (kept)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskTargetColumnId, setTaskTargetColumnId] = useState<string | null>(null)
  const [taskTitle, setTaskTitle] = useState("")
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM")
  const [taskDescription, setTaskDescription] = useState("")
  const [taskSaving, setTaskSaving] = useState(false)

  const MAX_MEMBERS = 5
  const remainingSlots = useMemo(() => Math.max(0, MAX_MEMBERS - members.length), [members.length])
  const atCapacity = remainingSlots === 0

  const nameFromEmail = (email: string) => {
    const local = email.split("@")[0].replace(/[._-]+/g, " ")
    return local
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
  }

  const sendInvite = () => {
    const email = inviteEmail.trim().toLowerCase()
    if (!email || atCapacity) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    if (members.some((m) => m.email === email)) return
    setMembers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), email, name: nameFromEmail(email), role: inviteRole },
    ])
    setInviteEmail("")
    setInviteRole("member")
  }

  const startEdit = (m: Member) => {
    setEditingId(m.id)
    setEditName(m.name)
  }
  const cancelEdit = () => {
    setEditingId(null)
    setEditName("")
  }
  const saveEdit = (id: string) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, name: editName.trim() || m.name } : m)))
    cancelEdit()
  }
  const changeRole = (id: string, role: Member["role"]) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)))
  }
  const deleteMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  // ===== Workspace API wiring (kept) =====
  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/workspaces", { cache: "no-store", credentials: "include" })
      if (!res.ok) return
      const data: Workspace[] = await res.json()

      if (data.length === 0) {
        const created = await fetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: "Personal Workspace" }),
        })
        if (created.ok) {
          const again = await fetch("/api/workspaces", { cache: "no-store", credentials: "include" })
          const list: Workspace[] = again.ok ? await again.json() : []
          setWorkspaces(
            list.map((w) => ({
              ...w,
              undeletable: w.isPersonal || w.name === "Personal Workspace",
            }))
          )
          if (!selectedWorkspaceId && list.length > 0) setSelectedWorkspaceId(list[0].id)
          return
        }
      }

      setWorkspaces(
        data.map((w) => ({
          ...w,
          undeletable: w.isPersonal || w.name === "Personal Workspace",
        }))
      )
      if (!selectedWorkspaceId && data.length > 0) setSelectedWorkspaceId(data[0].id)
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load columns & tasks for the selected workspace (kept)
  const reloadColumns = async (workspaceId: string) => {
    const res = await fetch(`/api/workspaces/${workspaceId}/columns`, {
      cache: "no-store",
      credentials: "include",
    })
    if (!res.ok) {
      setColumns([])
      return
    }
    const data: Column[] = await res.json()
    setColumns(data)
  }

  useEffect(() => {
    if (!selectedWorkspaceId) return
    reloadColumns(selectedWorkspaceId)
  }, [selectedWorkspaceId])

  // Create workspace (kept)
  const addWorkspace = async () => {
    const name = window.prompt("Workspace name?")
    if (!name) return

    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: name.trim() }),
    })

    if (!res.ok) {
      const msg = await res.text().catch(() => "")
      alert(`Failed to create workspace: ${res.status} ${msg || ""}`)
      return
    }

    const again = await fetch("/api/workspaces", { cache: "no-store", credentials: "include" })
    if (!again.ok) return
    const list: Workspace[] = await again.json()

    setWorkspaces(
      list.map((w) => ({
        ...w,
        undeletable: w.isPersonal || w.name === "Personal Workspace",
      }))
    )

    const last = list[list.length - 1]
    if (last) setSelectedWorkspaceId(last.id)
  }

  // Edit workspace (kept)
  const editWorkspace = async (id: string) => {
    const current = workspaces.find((w) => w.id === id)
    if (!current || current.undeletable) return
    const name = window.prompt("Rename workspace", current.name)
    if (!name) return
    const res = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    })
    if (res.ok) {
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === id ? { ...w, name: name.trim() } : w))
      )
    }
  }

  // Delete workspace (kept)
  const deleteWorkspace = async (id: string) => {
    const current = workspaces.find((w) => w.id === id)
    if (!current || current.undeletable) return
    const ok = window.confirm("Delete this workspace?")
    if (!ok) return
    const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" })
    if (res.ok) {
      setWorkspaces((prev) => prev.filter((w) => w.id !== id))
      if (selectedWorkspaceId === id) setSelectedWorkspaceId(workspaces[0]?.id ?? null)
    }
  }

  const isPersonal = workspaces.find((w) => w.id === selectedWorkspaceId)?.undeletable

  // Add Column (kept)
  const addColumn = async () => {
    if (!selectedWorkspaceId) return
    const name = window.prompt("Column name?")
    if (!name?.trim()) return
    const res = await fetch(`/api/workspaces/${selectedWorkspaceId}/columns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: name.trim() }),
    })
    if (!res.ok) {
      const msg = await res.text().catch(() => "")
      alert(`Failed to create column: ${res.status} ${msg || ""}`)
      return
    }
    reloadColumns(selectedWorkspaceId)
  }

  // ➕ open/close task dialog (kept)
  const openTaskDialogFor = (columnId: string) => {
    setTaskTargetColumnId(columnId)
    setTaskTitle("")
    setTaskPriority("MEDIUM")
    setTaskDescription("")
    setTaskDialogOpen(true)
  }
  const closeTaskDialog = () => {
    setTaskDialogOpen(false)
    setTaskTargetColumnId(null)
  }

  // ➕ create task (kept)
  const createTask = async () => {
    if (!taskTitle.trim() || !taskTargetColumnId || !selectedWorkspaceId) return
    setTaskSaving(true)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          columnId: taskTargetColumnId,
          title: taskTitle.trim(),
          description: taskDescription.trim() || undefined,
          priority: taskPriority, // "LOW" | "MEDIUM" | "HIGH"
        }),
      })
      if (!res.ok) {
        const msg = await res.text().catch(() => "")
        alert(`Failed to create task: ${res.status} ${msg || ""}`)
        return
      }
      await reloadColumns(selectedWorkspaceId)
      closeTaskDialog()
    } finally {
      setTaskSaving(false)
    }
  }

  // Priority badge tint (kept)
  const getPriorityTint = (p: Task["priority"]) =>
    p === "HIGH"
      ? "bg-destructive/15 text-destructive"
      : p === "MEDIUM"
      ? "bg-accent/15 text-accent-foreground"
      : "bg-secondary text-secondary-foreground"

  /* ➕ NEW: DnD handler (optimistic; persists to /api/tasks/move) */
  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result
      if (!destination) return

      const fromColId = source.droppableId
      const toColId = destination.droppableId
      const fromIndex = source.index
      const toIndex = destination.index

      if (fromColId === toColId && fromIndex === toIndex) return

      // optimistic UI
      setColumns((prev) => {
        const copy = prev.map((c) => ({ ...c, tasks: [...(c.tasks ?? [])] }))
        const fromCol = copy.find((c) => c.id === fromColId)
        const toCol = copy.find((c) => c.id === toColId)
        if (!fromCol || !toCol) return prev

        const [moved] = fromCol.tasks.splice(fromIndex, 1)
        if (!moved) return prev
        toCol.tasks.splice(toIndex, 0, moved)
        return copy
      })

      // persist
      const res = await fetch("/api/tasks/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ taskId: draggableId, toColumnId: toColId, toIndex }),
      })

      if (!res.ok && selectedWorkspaceId) {
        // rollback: reload from server
        await reloadColumns(selectedWorkspaceId)
      }
    },
    [selectedWorkspaceId]
  )

  // ===== UI =====
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* PRIMARY SIDEBAR (LEFT) */}
      <aside
        className={`fixed inset-y-0 left-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border
        transition-[width] duration-300 ease-in-out ${sidebarCollapsed ? "w-16" : "w-64"}`}
      >
        <div className="h-full flex flex-col p-4 gap-4">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <span className="text-base font-semibold mx-auto">Workspaces</span>
            )}
            <button
              onClick={toggleSidebar}
              className="p-1 rounded hover:bg-sidebar/50 transition"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
                  selectedWorkspaceId === ws.id ? "bg-sidebar/70 ring-1 ring-sidebar-border/50" : ""
                }`}
                onClick={() => setSelectedWorkspaceId(ws.id)}
              >
                {!sidebarCollapsed && <span className="truncate">{ws.name}</span>}
                {!ws.undeletable && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-2">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); editWorkspace(ws.id) }}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteWorkspace(ws.id) }}
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
              {!sidebarCollapsed ? "Add New Workspace" : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </aside>

      {/* MAIN (shifts for both sidebars) */}
      <main
        className={`transition-[margin] duration-300 ease-in-out ${
          sidebarCollapsed ? "ml-16" : "ml-64"
        } ${rightOpen ? "mr-80" : "mr-0"}`}
      >
        {/* top bar */}
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
                {workspaces.find((w) => w.id === selectedWorkspaceId)?.name ?? "—"}
              </span>
            </div>
            {!isPersonal && (
              <Users className="w-5 h-5 opacity-70 cursor-pointer" onClick={openRight} />
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="w-8 h-8 cursor-pointer">
                  <AvatarFallback className="bg-muted text-foreground/80 text-xs">U</AvatarFallback>
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

        {/* welcome + add column */}
        <section className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold mb-2">Welcome Back</h1>
              <p className="text-muted-foreground">Here's what's happening with your projects today</p>
            </div>
            <Button className="bg-primary text-primary-foreground hover:opacity-90" onClick={addColumn}>
              <Plus className="w-4 h-4 mr-2" />
              Add Column
            </Button>
          </div>

          {/* columns (DB-backed) + DnD */}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {columns.map((column) => (
                <div key={column.id} className="rounded-lg p-4 space-y-4 bg-card border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{column.name}</span>
                      <Badge variant="secondary" className="text-xs">{column.tasks?.length ?? 0}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => openTaskDialogFor(column.id)}
                      aria-label="Add task"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <Droppable droppableId={column.id} type="TASK">
                    {(dropProvided, dropSnapshot) => (
                      <div
                        ref={dropProvided.innerRef}
                        {...dropProvided.droppableProps}
                        className={`space-y-3 min-h-10 pb-1 ${dropSnapshot.isDraggingOver ? "bg-muted/40 rounded-md" : ""}`}
                      >
                        {(column.tasks ?? []).map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={dragSnapshot.isDragging ? "opacity-80" : ""}
                              >
                                <Card className="bg-card border-border">
                                  <CardContent className="p-4">
                                    {/* priority */}
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getPriorityTint(task.priority)}`}>
                                        <span className="inline-block size-1.5 rounded-full bg-current/70" />
                                        <span className="font-medium">
                                          {task.priority === "HIGH" ? "High" : task.priority === "MEDIUM" ? "Medium" : "Low"}
                                        </span>
                                      </div>
                                    </div>

                                    {/* title + description */}
                                    <h3 className="font-medium mb-1">{task.title}</h3>
                                    {task.description && (
                                      <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                                    )}

                                    {/* subtasks (if any) */}
                                    <div className="space-y-2">
                                      {(task.subtasks ?? []).map((sub) => (
                                        <label key={sub.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                          <Checkbox
                                            id={`sub-${task.id}-${sub.id}`}
                                            checked={sub.completed}
                                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            onClick={(e) => e.preventDefault()}
                                          />
                                          <span className={sub.completed ? "line-through text-primary" : "text-muted-foreground"}>
                                            {sub.title}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {dropProvided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}

              {/* Empty-state helper */}
              {columns.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No columns yet. Use “Add Column” to create one.
                </div>
              )}
            </div>
          </DragDropContext>
        </section>
      </main>

      {/* SECONDARY SIDEBAR (RIGHT) */}
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
              <span className="text-base font-semibold mx-auto">Team Members</span>
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
                        {m.name ? m.name[0]?.toUpperCase() : m.email[0]?.toUpperCase()}
                      </div>

                      <div className="flex-1">
                        {editingId === m.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8"
                            />
                            <Button size="icon" className="h-8 w-8" onClick={() => saveEdit(m.id)} aria-label="Save">
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
                              onClick={() => startEdit(m)}
                              aria-label="Edit name"
                            >
                              <PencilLine className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">{m.email}</div>

                        <div className="mt-2 max-w-[180px]">
                          <Select
                            value={m.role}
                            onValueChange={(v: "admin" | "member" | "viewer") => changeRole(m.id, v)}
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
                        onClick={() => deleteMember(m.id)}
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
                      : `You can add ${remainingSlots} more ${remainingSlots === 1 ? "member" : "members"} in this team.`}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-email" className="text-xs">Enter email address</Label>
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
                      onValueChange={(v: "admin" | "member" | "viewer") => setInviteRole(v)}
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
                    onClick={sendInvite}
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

      {/* Create Task Dialog (kept) */}
      <Dialog open={taskDialogOpen} onOpenChange={(open) => (open ? setTaskDialogOpen(true) : closeTaskDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={taskPriority} onValueChange={(v: "LOW" | "MEDIUM" | "HIGH") => setTaskPriority(v)}>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                rows={3}
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeTaskDialog}>
              Cancel
            </Button>
            <Button onClick={createTask} disabled={taskSaving || !taskTitle.trim()}>
              {taskSaving ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
