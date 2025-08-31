"use client"

import { useEffect, useMemo, useState } from "react"
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

type Task = {
  id: string
  title: string
  subtitle: string
  priority: "High" | "Medium" | "Low"
  progress: number
  subtasks: { id: string; label: string; completed: boolean }[]
}

type Column = {
  id: string
  title: string
  count: number
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
  // ----- Demo board data (unchanged) -----
  const [columns] = useState<Column[]>([
    {
      id: "1",
      title: "To do",
      count: 3,
      tasks: [
        {
          id: "1",
          title: "Setup Database",
          subtitle: "Configure PRISMA and PostgreSQL",
          priority: "High",
          progress: 75,
          subtasks: [
            { id: "1", label: "Install Packages", completed: true },
            { id: "2", label: "Setup Schema", completed: false },
          ],
        },
        {
          id: "2",
          title: "Setup Database",
          subtitle: "Configure PRISMA and PostgreSQL",
          priority: "High",
          progress: 45,
          subtasks: [
            { id: "3", label: "Install Packages", completed: true },
            { id: "4", label: "Setup Schema", completed: false },
          ],
        },
        {
          id: "3",
          title: "Setup Database",
          subtitle: "Configure PRISMA and PostgreSQL",
          priority: "High",
          progress: 60,
          subtasks: [
            { id: "5", label: "Install Packages", completed: true },
            { id: "6", label: "Setup Schema", completed: false },
          ],
        },
      ],
    },
    {
      id: "2",
      title: "To do",
      count: 3,
      tasks: [
        {
          id: "4",
          title: "Setup Database",
          subtitle: "Configure PRISMA and PostgreSQL",
          priority: "High",
          progress: 30,
          subtasks: [
            { id: "7", label: "Install Packages", completed: true },
            { id: "8", label: "Setup Schema", completed: false },
          ],
        },
        {
          id: "5",
          title: "Setup Database",
          subtitle: "Configure PRISMA and PostgreSQL",
          priority: "Medium",
          progress: 80,
          subtasks: [
            { id: "9", label: "Install Packages", completed: true },
            { id: "10", label: "Setup Schema", completed: false },
          ],
        },
        {
          id: "6",
          title: "Setup Database",
          subtitle: "Configure PRISMA and PostgreSQL",
          priority: "High",
          progress: 90,
          subtasks: [
            { id: "11", label: "Install Packages", completed: true },
            { id: "12", label: "Setup Schema", completed: false },
          ],
        },
      ],
    },
    {
      id: "3",
      title: "To do",
      count: 3,
      tasks: [
        {
          id: "7",
          title: "Setup Database",
          subtitle: "Configure PRISMA and PostgreSQL",
          priority: "High",
          progress: 25,
          subtasks: [
            { id: "13", label: "Install Packages", completed: true },
            { id: "14", label: "Setup Schema", completed: false },
          ],
        },
        {
          id: "8",
          title: "Setup Database",
          subtitle: "Configure PRISMA and PostgreSQL",
          priority: "High",
          progress: 55,
          subtasks: [
            { id: "15", label: "Install Packages", completed: true },
            { id: "16", label: "Setup Schema", completed: false },
          ],
        },
        {
          id: "9",
          title: "Setup Database",
          subtitle: "Configure PRISMA and PostgreSQL",
          priority: "Low",
          progress: 70,
          subtasks: [
            { id: "17", label: "Install Packages", completed: true },
            { id: "18", label: "Setup Schema", completed: false },
          ],
        },
      ],
    },
  ])

  const getPriorityTint = (p: Task["priority"]) =>
    p === "High"
      ? "bg-destructive/15 text-destructive"
      : p === "Medium"
      ? "bg-accent/15 text-accent-foreground"
      : "bg-secondary text-secondary-foreground"

  // ----- Primary sidebar -----
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const toggleSidebar = () => setSidebarCollapsed((s) => !s)

  // ----- Workspaces (via API) -----
  const [workspaces, setWorkspaces] = useState<WorkspaceUI[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)

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

  // ===== Workspace API wiring =====
  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/workspaces", { cache: "no-store" })
      if (!res.ok) return
      const data: Workspace[] = await res.json()

      if (data.length === 0) {
        // create a default Personal Workspace, then reload
        const created = await fetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Personal Workspace" }),
        })
        if (created.ok) {
          const again = await fetch("/api/workspaces", { cache: "no-store" })
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

  // ✅ FIXED addWorkspace: save to DB then reload list
  const addWorkspace = async () => {
    const name = window.prompt("Workspace name?")
    if (!name) return

    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    })

    if (res.ok) {
      const again = await fetch("/api/workspaces", { cache: "no-store" })
      const list: Workspace[] = again.ok ? await again.json() : []

      setWorkspaces(
        list.map((w) => ({
          ...w,
          undeletable: w.isPersonal || w.name === "Personal Workspace",
        }))
      )

      if (!selectedWorkspaceId && list.length > 0) {
        setSelectedWorkspaceId(list[list.length - 1].id)
      }
    }
  }

  // 3) Edit workspace
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

  // 4) Delete workspace
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

  // ===== UI (unchanged) =====
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
            <Button className="bg-primary text-primary-foreground hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Add Column
            </Button>
          </div>

          {/* columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map((column) => (
              <div key={column.id} className="rounded-lg p-4 space-y-4 bg-card border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{column.title}</span>
                    <Badge variant="secondary" className="text-xs">{column.count}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  {column.tasks.map((task) => (
                    <Card key={task.id} className="bg-card border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getPriorityTint(task.priority)}`}>
                            <span className="inline-block size-1.5 rounded-full bg-current/70" />
                            <span className="font-medium">{task.priority}</span>
                          </div>
                        </div>
                        <h3 className="font-medium mb-1">{task.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{task.subtitle}</p>
                        <div className="mb-4">
                          <div className="w-full h-1 rounded-full bg-muted">
                            <div className="h-1 rounded-full bg-primary" style={{ width: `${task.progress}%` }} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          {task.subtasks.map((sub) => (
                            <label key={sub.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <Checkbox
                                id={`sub-${task.id}-${sub.id}`}
                                checked={sub.completed}
                                className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                              <span className={sub.completed ? "line-through text-primary" : "text-muted-foreground"}>
                                {sub.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
    </div>
  )
}
