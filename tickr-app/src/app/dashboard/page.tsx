"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, ChevronRight, ChevronLeft, Users, LogOut } from "lucide-react"

interface Task {
  id: string
  title: string
  subtitle: string
  priority: "High" | "Medium" | "Low"
  progress: number
  subtasks: { id: string; label: string; completed: boolean }[]
}

interface Column {
  id: string
  title: string
  count: number
  tasks: Task[]
}

export default function KanbanBoard() {
  // Collapsible sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true)

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

  const handleLogout = () => {
    console.log("Logging out…")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* SIDEBAR – collapsible */}
      <aside
        className={`fixed inset-y-0 left-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground
          ${sidebarOpen ? "w-64" : "w-16"} transition-[width] duration-300 ease-in-out`}
      >
        <div className="h-full flex flex-col p-4 gap-6">
          {/* HEADER ROW WITH ALWAYS-VISIBLE TOGGLE */}
          {sidebarOpen ? (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Workspaces</span>
              <button
                type="button"
                aria-label="Collapse sidebar"
                onClick={() => setSidebarOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-sidebar/70"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <button
                type="button"
                aria-label="Expand sidebar"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-sidebar/70"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* workspace list */}
          <div className="space-y-1">
            <div className="px-3 py-2 rounded-lg bg-sidebar/70 ring-1 ring-sidebar-border/50 flex items-center">
              <span className={`whitespace-nowrap transition-all ${sidebarOpen ? "block" : "hidden"}`}>Personal</span>
              {!sidebarOpen && <span className="mx-auto h-2 w-2 rounded-full bg-sidebar-foreground/80" />}
            </div>
            <div className="px-3 py-2 rounded-lg hover:bg-sidebar/60 cursor-pointer flex items-center">
              <span className={`whitespace-nowrap transition-all ${sidebarOpen ? "block" : "hidden"}`}>Work</span>
              {!sidebarOpen && <span className="mx-auto h-2 w-2 rounded-full bg-sidebar-foreground/60" />}
            </div>
            <div className="px-3 py-2 rounded-lg hover:bg-sidebar/60 cursor-pointer flex items-center">
              <span className={`whitespace-nowrap transition-all ${sidebarOpen ? "block" : "hidden"}`}>Project</span>
              {!sidebarOpen && <span className="mx-auto h-2 w-2 rounded-full bg-sidebar-foreground/60" />}
            </div>
          </div>

          {/* add workspace button (hide when collapsed) */}
          {sidebarOpen ? (
            <Button className="mt-auto w-full bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90">
              Add New Workspace
            </Button>
          ) : (
            <div className="mt-auto flex justify-center">
              <Button size="icon" className="bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN – margin-left matches sidebar width */}
      <main
        className={`transition-[margin] duration-300 ease-in-out ${sidebarOpen ? "ml-64" : "ml-16"}`}
      >
        {/* top bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/60 backdrop-blur">
          {/* Left: logo (unchanged) */}
          <div className="flex items-center">
            <img src="/Group 5 (2).svg" alt="Tickr Logo" className="h-8 w-auto" />
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            <Button variant="outline" className="hidden sm:inline-flex">Dashboard</Button>
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-primary" />
              <span className="text-sm">Personal</span>
            </div>
            <Users className="w-5 h-5 opacity-70" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="w-8 h-8 cursor-pointer">
                  <AvatarFallback className="bg-muted text-foreground/80 text-xs">U</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover text-popover-foreground border-border" align="end">
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
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
                {/* column header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{column.title}</span>
                    <Badge variant="secondary" className="text-xs">{column.count}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* tasks */}
                <div className="space-y-3">
                  {column.tasks.map((task) => (
                    <Card key={task.id} className="bg-card border-border">
                      <CardContent className="p-4">
                        {/* priority pill */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getPriorityTint(task.priority)}`}>
                            <span className="inline-block size-1.5 rounded-full bg-current/70" />
                            <span className="font-medium">{task.priority}</span>
                          </div>
                        </div>

                        {/* title/subtitle */}
                        <h3 className="font-medium mb-1">{task.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{task.subtitle}</p>

                        {/* progress bar */}
                        <div className="mb-4">
                          <div className="w-full h-1 rounded-full bg-muted">
                            <div
                              className="h-1 rounded-full bg-primary"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* subtasks */}
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
