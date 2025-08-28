'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Crown, Shield, Eye, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  createdAt: Date
}

interface WorkspaceMember {
  id: string
  userId: string
  workspaceId: string
  role: 'ADMIN' | 'MEMBER' | 'VIEWER'
  joinedAt: Date
  user: User
}

interface TeamSidebarProps {
  workspaceId: string
  currentUserId: string
  isOwner: boolean
  isAdmin: boolean
}

export function TeamSidebar({ workspaceId, currentUserId, isOwner, isAdmin }: TeamSidebarProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER')
  const [inviteLoading, setInviteLoading] = useState(false)

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`)
      if (response.ok) {
        const data = await response.json()
        setMembers(data)
      }
    } catch (error) {
      console.error('Error fetching members:', error)
      toast.error('Failed to fetch team members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [workspaceId])

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviteLoading(true)
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Member invited successfully')
        setMembers([...members, data])
        setInviteEmail('')
        setInviteRole('MEMBER')
        setInviteDialogOpen(false)
      } else {
        toast.error(data.error || 'Failed to invite member')
      }
    } catch (error) {
      console.error('Error inviting member:', error)
      toast.error('Failed to invite member')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: 'ADMIN' | 'MEMBER' | 'VIEWER') => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        toast.success('Member role updated')
        fetchMembers() // Refresh the list
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to update member role')
      }
    } catch (error) {
      console.error('Error updating member role:', error)
      toast.error('Failed to update member role')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Member removed')
        setMembers(members.filter(m => m.id !== memberId))
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Failed to remove member')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="h-3 w-3" />
      case 'MEMBER':
        return <Eye className="h-3 w-3" />
      case 'VIEWER':
        return <Eye className="h-3 w-3" />
      default:
        return null
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'default'
      case 'MEMBER':
        return 'secondary'
      case 'VIEWER':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <Card className="w-80 h-fit">
        <CardHeader>
          <CardTitle className="text-lg">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                <div className="flex-1">
                  <div className="w-20 h-3 bg-muted rounded animate-pulse mb-1" />
                  <div className="w-16 h-2 bg-muted rounded animate-pulse" />
                </div>
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
          <CardTitle className="text-lg">Team Members</CardTitle>
          {(isOwner || isAdmin) && (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleInviteMember}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@example.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="VIEWER">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setInviteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={inviteLoading}>
                      {inviteLoading ? 'Inviting...' : 'Send Invite'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.map((member) => {
            const isCurrentUser = member.userId === currentUserId
            const isMemberOwner = member.id === 'owner'
            
            return (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(member.user.name, member.user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium truncate">
                        {member.user.name || member.user.email}
                        {isCurrentUser && <span className="text-muted-foreground"> (You)</span>}
                      </p>
                      {isMemberOwner && <Crown className="h-3 w-3 text-yellow-500" />}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={getRoleBadgeVariant(member.role)} 
                        className="text-xs"
                      >
                        <span className="flex items-center space-x-1">
                          {getRoleIcon(member.role)}
                          <span>{member.role.toLowerCase()}</span>
                        </span>
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {(isOwner || isAdmin) && !isCurrentUser && !isMemberOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {member.role !== 'ADMIN' && (
                        <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'ADMIN')}>
                          Make Admin
                        </DropdownMenuItem>
                      )}
                      {member.role !== 'MEMBER' && (
                        <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'MEMBER')}>
                          Make Member
                        </DropdownMenuItem>
                      )}
                      {member.role !== 'VIEWER' && (
                        <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'VIEWER')}>
                          Make Viewer
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
