"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, ChevronRight, Users, LogOut, MoreVertical } from "lucide-react"
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
  createdAt: number
  undeletable?: boolean
}

const WS_STORAGE_KEY = "tickr:workspaces"

export default function KanbanBoard() {
  // --- demo board data (unchanged) ---
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

  // --- tint helper (unchanged) ---
  const getPriorityTint = (p: Task["priority"]) =>
    p === "High"
      ? "bg-destructive/15 text-destructive"
      : p === "Medium"
      ? "bg-accent/15 text-accent-foreground"
      : "bg-secondary text-secondary-foreground"

  // --- left sidebar collapse state (unchanged) ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const toggleSidebar = () => setSidebarCollapsed((s) => !s)

  // --- right (secondary) sidebar state (opens ONLY from Users icon; no arrow; no partial width) ---
  const [rightOpen, setRightOpen] = useState(false)
  const openRight = () => setRightOpen(true)
  const closeRight = () => setRightOpen(false)
  const toggleRight = () => setRightOpen((o) => !o)

  // --- workspaces (persisted to localStorage) ---
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const selectedWorkspace = useMemo(
    () => workspaces.find((w) => w.id === selectedWorkspaceId) ?? null,
    [workspaces, selectedWorkspaceId]
  )
  const isPersonal = !!selectedWorkspace?.undeletable

  // Ensure Personal Workspace exists and is default
  useEffect(() => {
    try {
      const raw = localStorage.getItem(WS_STORAGE_KEY)
      let parsed: Workspace[] = raw ? JSON.parse(raw) : []

      if (!parsed.some((w) => w.undeletable)) {
        const personal: Workspace = {
          id: crypto.randomUUID(),
          name: "Personal Workspace",
          createdAt: Date.now(),
          undeletable: true,
        }
        parsed = [personal, ...parsed]
      }

      setWorkspaces(parsed)
      if (!selectedWorkspaceId && parsed.length > 0) {
        setSelectedWorkspaceId(parsed[0].id)
      }
    } catch {
      // ignore
    }
  }, [])

  // Persist changes
  useEffect(() => {
    localStorage.setItem(WS_STORAGE_KEY, JSON.stringify(workspaces))
  }, [workspaces])

  // Close secondary sidebar whenever switching to Personal
  useEffect(() => {
    if (isPersonal && rightOpen) setRightOpen(false)
  }, [isPersonal, rightOpen])

  const addWorkspace = () => {
    const name = window.prompt("Workspace name?")
    if (!name) return
    const ws: Workspace = { id: crypto.randomUUID(), name: name.trim(), createdAt: Date.now() }
    setWorkspaces((prev) => [...prev, ws])
    if (!selectedWorkspaceId) setSelectedWorkspaceId(ws.id)
  }

  const editWorkspace = (id: string) => {
    const current = workspaces.find((w) => w.id === id)
    if (!current || current.undeletable) return
    const name = window.prompt("Rename workspace", current.name)
    if (!name) return
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? { ...w, name: name.trim() } : w)))
  }

  const deleteWorkspace = (id: string) => {
    const current = workspaces.find((w) => w.id === id)
    if (!current || current.undeletable) return
    const ok = window.confirm("Delete this workspace?")
    if (!ok) return
    setWorkspaces((prev) => prev.filter((w) => w.id !== id))
    if (selectedWorkspaceId === id) setSelectedWorkspaceId(workspaces[0]?.id ?? null)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* PRIMARY SIDEBAR (LEFT) – unchanged */}
      <aside
        className={`fixed inset-y-0 left-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border
        transition-[width] duration-300 ease-in-out ${sidebarCollapsed ? "w-16" : "w-64"}`}
      >
        <div className="h-full flex flex-col p-4 gap-4">
          {/* header row */}
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && <span className="text-base font-semibold mx-auto">Workspaces</span>}
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

          {/* workspace list + button immediately below */}
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
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          editWorkspace(ws.id)
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteWorkspace(ws.id)
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
              {!sidebarCollapsed ? "Add New Workspace" : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </aside>

      {/* SECONDARY SIDEBAR (RIGHT) – no arrow, no partial visibility when closed */}
      <aside
        className={[
          "fixed inset-y-0 right-0 bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out overflow-hidden",
          rightOpen ? "w-80 border-l border-sidebar-border" : "w-0 border-l-0",
          isPersonal ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        {/* When closed, this is fully hidden. When open, full content appears. */}
        <div className="h-full flex flex-col p-4 gap-4">
          {/* header (no arrow) */}
          {rightOpen && <span className="text-base font-semibold mx-auto">Members</span>}

          {/* content */}
          {rightOpen ? (
            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="px-3 py-2 rounded-lg bg-sidebar/70 ring-1 ring-sidebar-border/50">
                <div className="text-sm font-medium">John Doe</div>
                <div className="text-xs text-muted-foreground">Admin</div>
              </div>
              <div className="px-3 py-2 rounded-lg hover:bg-sidebar/60">
                <div className="text-sm font-medium">Jane Smith</div>
                <div className="text-xs text-muted-foreground">Member</div>
              </div>
              <div className="px-3 py-2 rounded-lg hover:bg-sidebar/60">
                <div className="text-sm font-medium">Alex Lee</div>
                <div className="text-xs text-muted-foreground">Viewer</div>
              </div>

              <Button variant="outline" className="w-full mt-2">
                Invite Member
              </Button>
            </div>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </aside>

      {/* MAIN – left margin follows primary; right margin only when secondary is open */}
      <main
        className={[
          "transition-[margin] duration-300 ease-in-out",
          sidebarCollapsed ? "ml-16" : "ml-64",
          // Right margin: only when right sidebar is open (and not Personal)
          !isPersonal && rightOpen ? "mr-80" : "mr-0",
        ].join(" ")}
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
              <span className="text-sm">{selectedWorkspace?.name ?? "—"}</span>
            </div>

            {/* Users icon opens/closes the secondary sidebar (disabled on Personal) */}
            <button
              onClick={() => !isPersonal && toggleRight()}
              className={`rounded p-2 transition ${isPersonal ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/40"}`}
              aria-label="Open members panel"
              title={isPersonal ? "Not available in Personal Workspace" : rightOpen ? "Close members" : "Open members"}
            >
              <Users className="w-5 h-5 opacity-70" />
            </button>

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

        {/* welcome + add column (unchanged) */}
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

          {/* columns (unchanged) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map((column) => (
              <div key={column.id} className="rounded-lg p-4 space-y-4 bg-card border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{column.title}</span>
                    <Badge variant="secondary" className="text-xs">
                      {column.count}
                    </Badge>
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
                          <div
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getPriorityTint(
                              task.priority
                            )}`}
                          >
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
    </div>
  )
}
