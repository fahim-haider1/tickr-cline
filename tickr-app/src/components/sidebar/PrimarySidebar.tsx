'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, ChevronRight, Pencil, Trash2 } from 'lucide-react'

interface SidebarWorkspace {
  id: string
  name: string
  isPersonal?: boolean
}

interface PrimarySidebarProps {
  collapsed: boolean
  onToggle: () => void
  workspaces: SidebarWorkspace[]
  selectedWorkspaceId?: string
  onSelect: (id: string) => void
  onCreate: (name: string) => Promise<void> | void
  onRename: (id: string, name: string) => Promise<void> | void
  onDelete: (id: string) => Promise<void> | void
}

export function PrimarySidebar({
  collapsed,
  onToggle,
  workspaces,
  selectedWorkspaceId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: PrimarySidebarProps) {
  const [showInput, setShowInput] = useState(false)
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setCreating(true)
    try {
      await onCreate(trimmed)
      setName('')
      setShowInput(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen ${collapsed ? 'w-16' : 'w-64'} border-r z-[999] transition-all duration-300 relative overflow-hidden flex flex-col`}
      style={{
        background: 'linear-gradient(180deg, rgb(13 16 28) 0%, rgb(13 14 24) 100%)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div className="p-4">
        <div className="relative h-6 flex items-center mb-2">
          {!collapsed && (
            <h2 className="text-sm font-medium text-[oklch(0.85_0.02_280)] truncate">Workspaces</h2>
          )}
          <button
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            onClick={onToggle}
            className="absolute right-0 top-0 flex items-center justify-center rounded-md p-1 hover:bg-white/10 text-[oklch(0.85_0.02_280)]"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-180' : ''}`} />
            <ChevronRight className={`w-4 h-4 -ml-1 transition-transform ${collapsed ? '-rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Workspace list */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-4">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              role="button"
              onClick={() => onSelect(ws.id)}
              className={`group w-full px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                selectedWorkspaceId === ws.id
                  ? 'bg-white/10 text-white'
                  : 'text-[oklch(0.85_0.02_280)] hover:text-white hover:bg-white/5'
              }`}
            >
              {editingId === ws.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      await onRename(ws.id, editName)
                      setEditingId(null)
                      setEditName('')
                    } else if (e.key === 'Escape') {
                      setEditingId(null)
                      setEditName('')
                    }
                  }}
                  onBlur={async () => {
                    if (!editName.trim()) { setEditingId(null); setEditName(''); return }
                    await onRename(ws.id, editName)
                    setEditingId(null)
                    setEditName('')
                  }}
                  className="w-full bg-white/10 border-transparent text-white placeholder:text-white/60 rounded-md px-2 py-1 outline-none"
                  placeholder="Workspace name"
                />
              ) : (
                <span className="truncate mr-2">{ws.name}</span>
              )}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-1 rounded hover:bg-white/10"
                  title="Rename"
                  onClick={(e) => { e.stopPropagation(); setEditingId(ws.id); setEditName(ws.name) }}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  className="p-1 rounded hover:bg-white/10"
                  title="Delete"
                  onClick={async (e) => {
                    e.stopPropagation()
                    const ok = window.confirm('Delete this workspace?')
                    if (!ok) return
                    await onDelete(ws.id)
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create */}
      <div className="p-4">
        {collapsed ? (
          <div className="flex items-center justify-center">
            <Button
              size="icon"
              onClick={() => { onToggle(); setShowInput(true) }}
              className="text-white"
              style={{ background: '#ff1493' }}
              aria-label="Add New Workspace"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {showInput && (
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                  if (e.key === 'Escape') { setShowInput(false); setName('') }
                }}
                onBlur={() => {
                  if (!creating && !name.trim()) setShowInput(false)
                }}
                placeholder="Workspace name"
                className="w-full bg-white/10 border-transparent text-white placeholder:text-white/60 focus-visible:ring-0 focus-visible:outline-none"
              />
            )}
            <Button
              onClick={() => {
                if (!showInput) setShowInput(true)
                else if (name.trim()) void handleCreate()
              }}
              disabled={creating}
              className="w-full text-white disabled:opacity-60"
              style={{ background: '#ff1493' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Workspace
            </Button>
          </div>
        )}
      </div>
    </aside>
  )
}

