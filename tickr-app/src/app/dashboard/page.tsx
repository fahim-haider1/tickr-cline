'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { TeamMembersCard } from '@/components/TeamMembersCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Users, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import TaskCard from '@/components/board/TaskCard'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

// Inline creator for new workspace (keeps other logic intact)
function CreateWorkspaceInline({ onCreated, onRequestExpand, compact = false }: { onCreated: (ws: Workspace) => void; onRequestExpand?: () => void; compact?: boolean }) {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showInput, setShowInput] = useState(false)

  const create = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      setCreating(true)
      setErr(null)
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create workspace')
      onCreated(data)
      setName('')
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to create workspace')
    } finally {
      setCreating(false)
    }
  }

  if (compact) {
    return (
      <div className="flex items-center justify-center">
        <Button
          size="icon"
          onClick={() => { onRequestExpand?.(); setShowInput(true) }}
          disabled={creating}
          className="text-white"
          style={{ background: '#ff1493' }}
          aria-label="Add New Workspace"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {showInput && (
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') create()
            if (e.key === 'Escape') { setShowInput(false); setName(''); setErr(null) }
          }}
          onBlur={() => {
            if (!creating && !name.trim()) { setShowInput(false); setErr(null) }
          }}
          placeholder="Workspace name"
          className="w-full bg-white/10 border-transparent text-white placeholder:text-white/60 focus-visible:ring-0 focus-visible:outline-none"
        />
      )}
      <Button
        onClick={() => {
          if (!showInput) setShowInput(true)
          else if (name.trim()) create()
        }}
        disabled={creating}
        className="w-full text-white disabled:opacity-60"
        style={{ background: '#ff1493' }}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add New Workspace
      </Button>
      {err && <p className="text-xs text-red-400">{err}</p>}
    </div>
  )
}

interface WorkspaceMember {
  id: string
  userId: string
  workspaceId: string
  role: 'ADMIN' | 'MEMBER' | 'VIEWER'
  joinedAt: Date
  user: {
    id: string
    email: string
    name: string | null
    image: string | null
    createdAt: Date
    updatedAt: Date
  }
}

interface Workspace {
  id: string
  name: string
  description: string | null
  ownerId: string
  isPersonal: boolean
  createdAt: Date
  updatedAt: Date
  members: WorkspaceMember[]
  columns: any[]
}

export default function Dashboard() {
  const { isLoaded, user } = useUser()
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rightOpen, setRightOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => { if (user) fetchWorkspaces() }, [user])

  // Keep header/nav from overlapping the sidebar by shifting it using a CSS variable
  useEffect(() => {
    const width = collapsed ? '4rem' : '16rem'
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--primary-sidebar-offset', width)
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.documentElement.style.removeProperty('--primary-sidebar-offset')
      }
    }
  }, [collapsed])

  if (!isLoaded) {
    return (
      <div className="h-[70vh] grid place-items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }
  if (!user) redirect('/')

  const fetchWorkspaces = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/workspaces')
      if (!response.ok) throw new Error(`Failed to fetch workspaces: ${response.status}`)
      const data = await response.json()
      setWorkspaces(data)
      if (data.length > 0) setSelectedWorkspace(data[0])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load workspaces')
    } finally { setLoading(false) }
  }

  const handleMemberAdd = async (email: string, role: 'ADMIN' | 'MEMBER' | 'VIEWER') => {
    if (!selectedWorkspace) throw new Error('No workspace selected')
    const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to add member')
    fetchWorkspaces()
    return data
  }

  const handleMemberRemove = async (memberId: string) => {
    if (!selectedWorkspace) throw new Error('No workspace selected')
    const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/members/${memberId}`, { method: 'DELETE' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to remove member')
    fetchWorkspaces()
    return data
  }

  const handleRoleChange = async (memberId: string, newRole: 'ADMIN' | 'MEMBER' | 'VIEWER') => {
    if (!selectedWorkspace) throw new Error('No workspace selected')
    const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/members/${memberId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: newRole }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to change role')
    fetchWorkspaces()
    return data
  }

  

  // Rename workspace
  const renameWorkspace = async (id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const res = await fetch(`/api/workspaces/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Failed to rename workspace')
    setWorkspaces(prev => prev.map(w => (w.id === id ? { ...w, name: trimmed } : w)))
    if (selectedWorkspace?.id === id) setSelectedWorkspace({ ...(selectedWorkspace as Workspace), name: trimmed })
  }

  // Delete workspace
  const deleteWorkspace = async (id: string) => {
    const res = await fetch(`/api/workspaces/${id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Failed to delete workspace')
    setWorkspaces(prev => prev.filter(w => w.id !== id))
    if (selectedWorkspace?.id === id) {
      setSelectedWorkspace(prev => {
        const remaining = workspaces.filter(w => w.id !== id)
        return remaining[0] ?? null
      })
    }
  }

  const isOwner = selectedWorkspace?.ownerId === user.id
  const userMembership = selectedWorkspace?.members.find(m => m.userId === user.id)
  const isAdmin = isOwner || userMembership?.role === 'ADMIN'

  return (
    <div
      className="min-h-screen bg-background text-foreground overflow-x-hidden"
      style={{
        marginLeft: 'var(--primary-sidebar-offset, 16rem)',
        width: 'calc(100% - var(--primary-sidebar-offset, 16rem))',
      }}
    >
      {/* Ensure the header offsets correctly on first paint (SSR + CSR) */}
      <style jsx global>{` :root{ --primary-sidebar-offset: ${collapsed ? '4rem' : '16rem'}; } `}</style>
      {/* LEFT SIDEBAR (fixed) */}
      <aside
        className={`fixed left-0 top-0 h-screen overflow-y-auto ${collapsed ? 'w-16' : 'w-64'} border-r z-[999] transition-all duration-300 relative`}
        style={{
          // make the sidebar fully opaque so background isn't visible
          background: "linear-gradient(180deg, rgb(13 16 28) 0%, rgb(13 14 24) 100%)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="p-4">
          <div className="relative mb-4 h-6 flex items-center">
            <span className={`text-sm font-medium text-[oklch(0.85_0.02_280)] ${collapsed ? 'hidden' : 'block'} truncate`}>Workspaces</span>
            <button
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(v => !v)}
              className="absolute right-0 top-0 flex items-center justify-center rounded-md p-1 hover:bg-white/10 text-[oklch(0.85_0.02_280)]"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-180' : ''}`} />
              <ChevronRight className={`w-4 h-4 -ml-1 transition-transform ${collapsed ? '-rotate-180' : ''}`} />
            </button>
          </div>

          {/* Workspace list (matches mock) */}
          <div className={`mb-6 space-y-2 ${collapsed ? 'hidden' : 'block'}`}>
            {loading ? (
              <>
                <div className="h-9 rounded-md bg-white/5 animate-pulse" />
                <div className="h-9 rounded-md bg-white/5 animate-pulse" />
                <div className="h-9 rounded-md bg-white/5 animate-pulse" />
              </>
            ) : (
              workspaces.map((ws) => {
                const active = selectedWorkspace?.id === ws.id
                return (
                  <div
                    key={ws.id}
                    role="button"
                    onClick={() => setSelectedWorkspace(ws)}
                    className={`group w-full px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                      active
                        ? 'bg-[#181834] text-white'
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
                            try { await renameWorkspace(ws.id, editName) } finally { setEditingId(null); setEditName('') }
                          } else if (e.key === 'Escape') {
                            setEditingId(null); setEditName('')
                          }
                        }}
                        onBlur={async () => {
                          if (!editName.trim()) { setEditingId(null); setEditName(''); return }
                          try { await renameWorkspace(ws.id, editName) } finally { setEditingId(null); setEditName('') }
                        }}
                        className="w-full bg-white/10 border-transparent text-white placeholder:text-white/60 rounded-md px-2 py-1 outline-none"
                        placeholder="Workspace name"
                      />
                    ) : (
                      <span className="truncate mr-2">{ws.name}</span>
                    )}
                    {/* Actions */}
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
                          e.stopPropagation();
                          const ok = window.confirm('Delete this workspace?')
                          if (!ok) return
                          try { await deleteWorkspace(ws.id) } catch (err) { console.error(err) }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Create workspace input + button */}
          <div className={collapsed ? 'px-0' : ''}>
            <CreateWorkspaceInline onCreated={(ws) => {
              setWorkspaces(prev => [...prev, ws])
              setSelectedWorkspace(ws)
            }}
            onRequestExpand={() => setCollapsed(false)}
            compact={collapsed}
            />
          </div>
      </div>
      </aside>

      {/* MAIN */}
      <main className="relative transition-all duration-300">
        {/* Background glow like the mock */}
        <div className="pointer-events-none absolute inset-0 -z-10"
             style={{
               background:
                 "radial-gradient(55% 45% at 15% 10%, rgba(0, 255, 200, 0.10), transparent 60%), radial-gradient(45% 35% at 90% 85%, rgba(255, 0, 184, 0.12), transparent 60%)",
             }}
        />

        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b max-w-7xl mx-auto" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <img src="/tickr-logo.png" alt="Tickr" className="h-7 w-auto" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: "#ff1493" }} />
              <span className="text-sm">Personal</span>
            </div>
            <button onClick={() => setRightOpen(true)} className="rounded-full p-2 hover:bg-white/10" title="Team Members">
              <Users className="w-5 h-5 text-white/70" />
            </button>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-muted text-foreground text-xs">
                {(user.firstName?.[0] ?? 'U').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* RIGHT OVERLAY PANEL (team) */}
        <div
          className={`fixed inset-0 z-40 transition ${rightOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          aria-hidden={!rightOpen}
          onClick={() => setRightOpen(false)}
        >
          <div className={`absolute inset-0 bg-black/40 transition-opacity ${rightOpen ? 'opacity-100' : 'opacity-0'}`} />
          <div
            className={`absolute right-0 top-0 h-full w-[360px] border-l px-4 py-4 overflow-y-auto transition-transform ${
              rightOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{
              backgroundColor: 'oklch(0.13 0.04 280 / .95)',
              borderColor: 'rgba(255,255,255,.1)',
              backdropFilter: 'blur(6px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Team Members</h3>
            {selectedWorkspace && (
              <TeamMembersCard
                members={selectedWorkspace.members}
                workspaceId={selectedWorkspace.id}
                currentUserId={user.id}
                isAdmin={isAdmin}
                onMemberAdd={handleMemberAdd}
                onMemberRemove={handleMemberRemove}
                onRoleChange={handleRoleChange}
              />
            )}
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6 max-w-7xl mx-auto">
          {/* Welcome + Add Column button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold mb-2">Welcome Back</h1>
              <p className="text-muted-foreground">Here's what's happening with your projects today</p>
            </div>
            <Button className="text-white" style={{ background: "#ff1493" }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Column
            </Button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Columns", value: selectedWorkspace?.columns?.length || 2, sub: "Including Todo & Done" },
              { label: "Tasks", value: selectedWorkspace?.columns?.reduce((t, c) => t + (c.tasks?.length || 0), 0) || 0, sub: "Across all columns" },
              { label: "Team Members", value: selectedWorkspace?.members.length ?? 0, sub: `${selectedWorkspace?.members.length ?? 0}/5 members` },
            ].map((stat, i) => (
              <Card key={i}
                className="border"
                style={{ background: "rgba(20,22,35,0.8)", borderColor: "rgba(255,255,255,0.08)" }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{stat.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-sm text-muted-foreground">{stat.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* KANBAN COLUMNS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0,1,2].map((col) => (
              <div key={col} className="rounded-lg p-4 border" style={{ background: "rgba(26,26,46,0.35)", borderColor: "rgba(42,42,74,0.3)" }}>
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">To do</span>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[11px] px-1.5" style={{ background: "#2a2a4a", color: "#fff" }}>3</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Column body */}
                <div className="space-y-3">
                  {col === 0 ? (
                    <>
                      <TaskCard
                        title="Setup Database"
                        subtitle="Configure PRISMA and PostgreSQL"
                        priority="High"
                        subtasks={[
                          { id: "1", title: "Install Packages", done: true },
                          { id: "2", title: "Setup Schema", done: false },
                        ]}
                      />
                      <TaskCard
                        title="UI Layout"
                        subtitle="Build Kanban board columns"
                        priority="Medium"
                        subtasks={[
                          { id: "3", title: "Design To Do column", done: true },
                          { id: "4", title: "Design Done column", done: false },
                          { id: "5", title: "Style with Tailwind", done: false },
                        ]}
                      />
                      <TaskCard
                        title="Auth Integration"
                        subtitle="Google OAuth with Clerk"
                        priority="Low"
                        subtasks={[
                          { id: "6", title: "Setup Clerk keys", done: true },
                          { id: "7", title: "Protect routes", done: true },
                          { id: "8", title: "Test login flow", done: false },
                        ]}
                      />
                    </>
                  ) : col === 1 ? (
                    <div className="text-sm text-white/70 text-center py-8">Ready for active tasks</div>
                  ) : (
                    <div className="text-sm text-white/70 text-center py-8">Completed tasks will appear here</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
