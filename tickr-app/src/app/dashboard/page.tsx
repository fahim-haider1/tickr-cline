'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { WorkspaceSelector } from '@/components/workspace-selector'
import { TeamMembersCard } from '@/components/TeamMembersCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Settings, BarChart3 } from 'lucide-react'

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
  const { user, isLoaded } = useUser()
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchWorkspaces()
    }
  }, [user])

  const fetchWorkspaces = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/workspaces')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch workspaces: ${response.status}`)
      }
      
      const data = await response.json()
      setWorkspaces(data)
      
      if (data.length > 0) {
        setSelectedWorkspace(data[0])
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error)
      setError(error instanceof Error ? error.message : 'Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }

  const handleMemberAdd = async (email: string, role: 'ADMIN' | 'MEMBER' | 'VIEWER') => {
    if (!selectedWorkspace) throw new Error('No workspace selected')
    
    try {
      const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add member')
      }
      
      // Refresh workspaces to get updated data
      fetchWorkspaces()
      return data
    } catch (error) {
      console.error('Error adding member:', error)
      throw error
    }
  }

  const handleMemberRemove = async (memberId: string) => {
    if (!selectedWorkspace) throw new Error('No workspace selected')
    
    try {
      const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/members/${memberId}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member')
      }
      
      fetchWorkspaces()
      return data
    } catch (error) {
      console.error('Error removing member:', error)
      throw error
    }
  }

  const handleRoleChange = async (memberId: string, newRole: 'ADMIN' | 'MEMBER' | 'VIEWER') => {
    if (!selectedWorkspace) throw new Error('No workspace selected')
    
    try {
      const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to change role')
      }
      
      fetchWorkspaces()
      return data
    } catch (error) {
      console.error('Error changing role:', error)
      throw error
    }
  }

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    redirect('/')
  }

  const isOwner = selectedWorkspace?.ownerId === user.id
  const userMembership = selectedWorkspace?.members.find(m => m.userId === user.id)
  const isAdmin = isOwner || userMembership?.role === 'ADMIN'

  return (
    <div className="container mx-auto px-4 py-8">
      <img src="/images/Group 5 (2).svg" alt="Tickr Logo" className='h-10 w-10' />

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user.firstName || user.emailAddresses[0]?.emailAddress}!</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your projects today
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-md">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-800 hover:text-red-900"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Left Sidebar - Workspaces */}
        <div className="w-64 flex-shrink-0">
          <WorkspaceSelector
            onWorkspaceSelect={setSelectedWorkspace}
            selectedWorkspaceId={selectedWorkspace?.id}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {selectedWorkspace ? (
            <div>
              {/* Workspace Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold">{selectedWorkspace.name}</h2>
                  {selectedWorkspace.description && (
                    <p className="text-muted-foreground mt-1">{selectedWorkspace.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                  {(isOwner || isAdmin) && (
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Columns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{selectedWorkspace.columns?.length || 2}</div>
                    <p className="text-sm text-muted-foreground">Including Todo & Done</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {selectedWorkspace.columns?.reduce((total, column) => total + (column.tasks?.length || 0), 0) || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Across all columns</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Team Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{selectedWorkspace.members.length}</div>
                    <p className="text-sm text-muted-foreground">
                      {selectedWorkspace.members.length}/5 members
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Main Workspace Area */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Kanban Board</CardTitle>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[400px]">
                    {/* To Do Column */}
                    <div className="bg-muted/20 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">To Do</h3>
                        <Button variant="ghost" size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground text-center py-8">
                          No tasks yet. Click "Add Task" to get started!
                        </div>
                      </div>
                    </div>

                    {/* In Progress Column */}
                    <div className="bg-muted/20 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">In Progress</h3>
                        <Button variant="ghost" size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground text-center py-8">
                          Ready for active tasks
                        </div>
                      </div>
                    </div>

                    {/* Done Column */}
                    <div className="bg-muted/20 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Done</h3>
                        <Button variant="ghost" size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground text-center py-8">
                          Completed tasks will appear here
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">
                  {loading ? 'Loading workspaces...' : 'Select a workspace'}
                </h3>
                <p className="text-muted-foreground">
                  {loading ? 'Please wait while we load your workspaces' : 'Choose a workspace from the sidebar to get started'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Team Management */}
        {selectedWorkspace && (
          <div className="w-80 flex-shrink-0">
            <TeamMembersCard
              members={selectedWorkspace.members}
              workspaceId={selectedWorkspace.id}
              currentUserId={user.id}
              isAdmin={isAdmin}
              onMemberAdd={handleMemberAdd}
              onMemberRemove={handleMemberRemove}
              onRoleChange={handleRoleChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}