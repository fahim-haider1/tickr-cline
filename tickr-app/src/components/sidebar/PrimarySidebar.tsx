"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChevronRight, Plus } from "lucide-react"
import { WorkspaceSelector } from "@/components/workspace-selector"

interface WS { id: string; name: string }
export interface PrimarySidebarProps {
  selectedWorkspaceId?: string
  onWorkspaceSelect: (ws: WS | null) => void
  onCreateWorkspace?: () => void
}

type Invite = {
  id: string
  role: "ADMIN" | "MEMBER" | "VIEWER"
  createdAt: string
  workspace: { id: string; name: string; isPersonal?: boolean }
}

export default function PrimarySidebar({
  selectedWorkspaceId,
  onWorkspaceSelect,
  onCreateWorkspace,
}: PrimarySidebarProps) {
  const [open, setOpen] = useState(true)
  const width = open ? 256 : 64

  const [invites, setInvites] = useState<Invite[]>([])
  const loadInvites = useCallback(async () => {
    try {
      const res = await fetch("/api/invitations/pending", {
        cache: "no-store",
        credentials: "include",
      })
      if (!res.ok) return
      const data = (await res.json()) as Invite[]
      setInvites(data)
    } catch {}
  }, [])

  useEffect(() => {
    loadInvites()
  }, [loadInvites])

  const accept = async (id: string) => {
    try {
      const res = await fetch(`/api/invitations/${id}/accept`, {
        method: "POST",
        credentials: "include",
      })
      if (res.ok) setInvites(prev => prev.filter(i => i.id !== id))
    } catch {}
  }

  const decline = async (id: string) => {
    try {
      const res = await fetch(`/api/invitations/${id}/decline`, {
        method: "POST",
        credentials: "include",
      })
      if (res.ok) setInvites(prev => prev.filter(i => i.id !== id))
    } catch {}
  }

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
          onClick={() => setOpen(v => !v)}
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
        <div className={`${open ? "block" : "hidden"} mb-4`}>
          <WorkspaceSelector
            onWorkspaceSelect={(ws) => onWorkspaceSelect(ws as unknown as WS | null)}
            selectedWorkspaceId={selectedWorkspaceId}
          />
        </div>

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

        <div className={`${open ? "block" : "hidden"} pt-6`}>
          <Button
            onClick={onCreateWorkspace}
            className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Workspace
          </Button>
        </div>

        <div className={`${open ? "block" : "hidden"} pt-4`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide opacity-70">Invitations</span>
            {invites.length > 0 && (
              <span className="rounded-full bg-sidebar-accent px-2 py-0.5 text-[10px] text-sidebar-accent-foreground">
                {invites.length}
              </span>
            )}
          </div>

          {invites.length === 0 ? (
            <p className="text-xs text-sidebar-foreground/60">No pending invites</p>
          ) : (
            <div className="space-y-2">
              {invites.map(inv => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-md border border-sidebar-border/60 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{inv.workspace.name}</div>
                    <div className="text-[11px] opacity-70">Role: {inv.role.toLowerCase()}</div>
                  </div>
                  <div className="ml-2 flex items-center gap-1">
                    <Button size="sm" className="h-7 px-2" onClick={() => accept(inv.id)}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => decline(inv.id)}>
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
