'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, User, Crown, Shield, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TeamMember {
  id: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
}

interface TeamMembersCardProps {
  members: TeamMember[];
  workspaceId: string;
  currentUserId: string;
  isAdmin: boolean;
  onMemberAdd: (email: string, role: 'ADMIN' | 'MEMBER' | 'VIEWER') => Promise<void>;
  onMemberRemove: (memberId: string) => Promise<void>;
  onRoleChange: (memberId: string, newRole: 'ADMIN' | 'MEMBER' | 'VIEWER') => Promise<void>;
}

export function TeamMembersCard({
  members,
  workspaceId,
  currentUserId,
  isAdmin,
  onMemberAdd,
  onMemberRemove,
  onRoleChange
}: TeamMembersCardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isChangingRole, setIsChangingRole] = useState<string | null>(null);

  const canAddMoreMembers = members.length < 5;
  const adminCount = members.filter(m => m.role === 'ADMIN').length;

  const handleAddMember = async () => {
    if (!newMemberEmail.trim() || !canAddMoreMembers) return;

    setIsAdding(true);
    setError(null);
    
    try {
      await onMemberAdd(newMemberEmail.trim(), newMemberRole);
      setNewMemberEmail('');
      setNewMemberRole('MEMBER');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding member:', error);
      setError(error instanceof Error ? error.message : 'Failed to add member');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setIsRemoving(memberId);
    setError(null);
    
    try {
      await onMemberRemove(memberId);
    } catch (error) {
      console.error('Error removing member:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove member');
    } finally {
      setIsRemoving(null);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'ADMIN' | 'MEMBER' | 'VIEWER') => {
    setIsChangingRole(memberId);
    setError(null);
    
    try {
      await onRoleChange(memberId, newRole);
    } catch (error) {
      console.error('Error changing role:', error);
      setError(error instanceof Error ? error.message : 'Failed to change role');
    } finally {
      setIsChangingRole(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return <Shield className="h-3 w-3" />;
      case 'MEMBER': return <User className="h-3 w-3" />;
      case 'VIEWER': return <Eye className="h-3 w-3" />;
      default: return <User className="h-3 w-3" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'MEMBER': return 'bg-blue-100 text-blue-800';
      case 'VIEWER': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Team Members</CardTitle>
          <div className="text-sm text-muted-foreground">
            {members.length}/5 members
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Error Message */}
          {error && (
            <div className="p-2 bg-red-100 text-red-700 text-sm rounded-md">
              {error}
            </div>
          )}

          {/* Members List */}
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  {member.user.image ? (
                    <img
                      src={member.user.image}
                      alt={member.user.name || ''}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <User className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.user.name || member.user.email}
                    {member.userId === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {isAdmin && member.userId !== currentUserId ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleChangeRole(member.id, e.target.value as 'ADMIN' | 'MEMBER' | 'VIEWER')}
                    disabled={isChangingRole === member.id}
                    className="text-xs border rounded px-2 py-1 bg-background"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                ) : (
                  <Badge variant="outline" className={getRoleColor(member.role)}>
                    <div className="flex items-center space-x-1">
                      {getRoleIcon(member.role)}
                      <span className="text-xs">{member.role}</span>
                    </div>
                  </Badge>
                )}
                
                {isAdmin && member.userId !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={isRemoving === member.id}
                  >
                    {isRemoving === member.id ? (
                      <div className="animate-spin h-3 w-3 border-b-2 border-current"></div>
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* Add Member Form */}
          {showAddForm && canAddMoreMembers && (
            <div className="p-3 bg-muted/30 rounded-md space-y-3">
              <div className="space-y-2">
                <Input
                  placeholder="Enter email address"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  type="email"
                  className="text-sm"
                />
                
                <div className="flex space-x-2">
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as 'ADMIN' | 'MEMBER' | 'VIEWER')}
                    className="flex-1 text-sm border rounded-md px-3 py-2"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                  
                  <Button
                    size="sm"
                    onClick={handleAddMember}
                    disabled={isAdding || !newMemberEmail.trim() || (newMemberRole === 'ADMIN' && adminCount >= 2)}
                  >
                    {isAdding ? 'Adding...' : 'Add'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false);
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                
                {newMemberRole === 'ADMIN' && adminCount >= 2 && (
                  <p className="text-xs text-red-500">
                    Maximum 2 admins allowed per workspace
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Add Member Button */}
          {!showAddForm && isAdmin && canAddMoreMembers && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setShowAddForm(true);
                setError(null);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          )}

          {!canAddMoreMembers && isAdmin && (
            <p className="text-xs text-muted-foreground text-center">
              Maximum 5 members reached for this workspace
            </p>
          )}

          {!isAdmin && (
            <p className="text-xs text-muted-foreground text-center">
              Only admins can manage team members
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}