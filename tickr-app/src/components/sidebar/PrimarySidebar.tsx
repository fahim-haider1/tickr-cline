"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronRight, Plus } from "lucide-react"
import { WorkspaceSelector } from "@/components/workspace-selector"

interface WS {
  id: string
  name: string
}
export interface PrimarySidebarProps {
  selectedWorkspaceId?: string
  onWorkspaceSelect: (ws: WS | null) => void
  onCreateWorkspace?: () => void
}

export default function PrimarySidebar({
  selectedWorkspaceId,
  onWorkspaceSelect,
  onCreateWorkspace,
}: PrimarySidebarProps) {
  const [open, setOpen] = useState(true)
  const width = open ? 256 : 64

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen border-r bg-sidebar text-sidebar-foreground transition-[width] duration-300"
      style={{ width, borderColor: "var(--sidebar-border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className={`text-sm font-medium transition-opacity ${open ? "opacity-100" : "opacity-0"}`}>
          Workspaces
        </span>
        <button
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          onClick={() => setOpen((v) => !v)}
          className="rounded p-1 hover:bg-sidebar-accent/20"
        >
          <div className={`flex items-center ${open ? "rotate-180" : ""}`}>
            <ChevronRight className="h-4 w-4 -mr-1" />
            <ChevronRight className="h-4 w-4" />
          </div>
        </button>
      </div>

      {/* Body */}
      <div className="px-4">
        {/* your existing workspace selector */}
        <div className={`${open ? "block" : "hidden"} mb-4`}>
          <WorkspaceSelector
            onWorkspaceSelect={(ws) => onWorkspaceSelect(ws as unknown as WS | null)}
            selectedWorkspaceId={selectedWorkspaceId}
          />
        </div>

        {/* Static list just to mirror the mock (optional, safe to remove) */}
        <div className={`${open ? "space-y-2" : "hidden"}`}>
          <div className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--sidebar-accent)" }}>
            <span className="text-sidebar-accent-foreground">Personal</span>
          </div>
          <div className="cursor-default rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/10">
            Work
          </div>
          <div className="cursor-default rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/10">
            Project
          </div>
        </div>

        {/* Create workspace */}
        <div className={`${open ? "block" : "hidden"} pt-6`}>
          <Button
            onClick={onCreateWorkspace}
            className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Workspace
          </Button>
        </div>
      </div>
    </aside>
  )
}
