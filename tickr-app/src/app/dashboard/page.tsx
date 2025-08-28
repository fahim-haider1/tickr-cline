'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { WorkspaceSelector } from '@/components/workspace-selector'
import { TeamSidebar } from '@/components/team-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Settings, BarChart3 } from 'lucide-react'

interface Workspace {
  id: string
  name: string
  description: string | null
  ownerId: string
  createdAt: Date
  updatedAt: Date
  members: {
    id: string
    userId: string
    role: 'ADMIN' | 'MEMBER' | 'VIEWER'
    user: {
      id: string
      email: string
      name: string | null
    }
  }[]
}

export default function Dashboard() {
  const { user, isLoaded } = useUser()
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user.firstName || user.emailAddresses[0]?.emailAddress}!</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your projects today
        </p>
      </div>

      <div className="flex gap-6">
        {/* Left Sidebar - Workspaces */}
        <div className="space-y-4">
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
                    <div className="text-3xl font-bold">3</div>
                    <p className="text-sm text-muted-foreground">To Do, In Progress, Done</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">0</div>
                    <p className="text-sm text-muted-foreground">Ready to get started</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Team Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{selectedWorkspace.members.length + 1}</div>
                    <p className="text-sm text-muted-foreground">Including you</p>
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
                <h3 className="text-lg font-semibold mb-2">Select a workspace</h3>
                <p className="text-muted-foreground">Choose a workspace from the sidebar to get started</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Team Management */}
        {selectedWorkspace && (
          <div>
            <TeamSidebar
              workspaceId={selectedWorkspace.id}
              currentUserId={user.id}
              isOwner={isOwner}
              isAdmin={isAdmin}
            />
          </div>
        )}
      </div>
    </div>
  )
}
