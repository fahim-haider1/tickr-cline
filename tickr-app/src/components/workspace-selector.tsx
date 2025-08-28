'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, Settings } from 'lucide-react'

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

interface WorkspaceSelectorProps {
  onWorkspaceSelect: (workspace: Workspace) => void
  selectedWorkspaceId?: string
}

export function WorkspaceSelector({ onWorkspaceSelect, selectedWorkspaceId }: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch('/api/workspaces')
      if (response.ok) {
        const data = await response.json()
        setWorkspaces(data)
        
        // Auto-select first workspace if none selected
        if (data.length > 0 && !selectedWorkspaceId) {
          onWorkspaceSelect(data[0])
        }
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkspaces()
  }, [])

  if (loading) {
    return (
      <Card className="w-80 h-fit">
        <CardHeader>
          <CardTitle className="text-lg">Workspaces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="w-32 h-4 bg-muted rounded animate-pulse mb-2" />
                <div className="w-16 h-3 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-80 h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Workspaces</CardTitle>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedWorkspaceId === workspace.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => onWorkspaceSelect(workspace)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">{workspace.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {workspace.members.length + 1}
                </Badge>
              </div>
              {workspace.description && (
                <p className="text-xs text-muted-foreground truncate mb-2">
                  {workspace.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Created {new Date(workspace.createdAt).toLocaleDateString()}
                </span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
