// src/components/kanban/Sidebar.tsx
"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronRight, MoreVertical, Plus } from "lucide-react";
import type { WorkspaceUI } from "@/types/kanban";

type Props = {
  collapsed: boolean;
  toggle: () => void;
  workspaces: WorkspaceUI[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  addWorkspace: () => void;
  editWorkspace: (id: string) => void;
  deleteWorkspace: (id: string) => void;
};

export default function Sidebar({
  collapsed,
  toggle,
  workspaces,
  selectedId,
  setSelectedId,
  addWorkspace,
  editWorkspace,
  deleteWorkspace,
}: Props) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border
      transition-[width] duration-300 ease-in-out ${collapsed ? "w-16" : "w-64"}`}
    >
      <div className="h-full flex flex-col p-4 gap-4">
        <div className="flex items-center justify-between">
          {!collapsed && <span className="text-base font-semibold mx-auto">Workspaces...</span>}
          <button
            onClick={toggle}
            className="p-1 rounded hover:bg-sidebar/50 transition"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 rotate-180" />}
          </button>
        </div>

        <div className="space-y-1 overflow-y-auto">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-sidebar/60 cursor-pointer ${
                selectedId === ws.id ? "bg-sidebar/70 ring-1 ring-sidebar-border/50" : ""
              }`}
              onClick={() => setSelectedId(ws.id)}
            >
              {!collapsed && <span className="truncate">{ws.name}</span>}
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
            {!collapsed ? "Add New Workspace" : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </aside>
  );
}
