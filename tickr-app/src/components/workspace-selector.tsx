'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus, Settings, Users, Inbox, Check, X } from 'lucide-react';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  isPersonal: boolean;
  createdAt: Date;
  updatedAt: Date;
  members: WorkspaceMember[];
  columns: any[];
}

type PendingInvite = {
  id: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  createdAt: string;
  workspace: { id: string; name: string };
};

interface WorkspaceSelectorProps {
  onWorkspaceSelect: (workspace: Workspace) => void;
  selectedWorkspaceId?: string;
}

export function WorkspaceSelector({ onWorkspaceSelect, selectedWorkspaceId }: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const hasInvites = invites.length > 0;

  const fetchWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/workspaces');
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data);
        if (data.length > 0 && !selectedWorkspaceId) {
          onWorkspaceSelect(data[0]);
        }
      } else {
        console.error('Failed to load workspaces', response.status);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setLoading(false);
    }
  }, [onWorkspaceSelect, selectedWorkspaceId]);

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch('/api/invitations/pending', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (res.ok) {
        const data: PendingInvite[] = await res.json();
        setInvites(data);
      }
    } catch (e) {
      console.error('Error fetching invitations', e);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
    fetchInvites();
  }, [fetchWorkspaces, fetchInvites]);

  const handleWorkspaceCreated = (newWorkspace: Workspace) => {
    setWorkspaces(prev => [...prev, newWorkspace]);
    onWorkspaceSelect(newWorkspace);
  };

  const acceptInvite = async (id: string) => {
    try {
      const res = await fetch(`/api/invitations/${id}/accept`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setInvites(prev => prev.filter(i => i.id !== id));
        await fetchWorkspaces();
      } else {
        const j = await res.json().catch(() => ({}));
        console.error('Accept failed', j);
      }
    } catch (e) {
      console.error('Accept error', e);
    }
  };

  const declineInvite = async (id: string) => {
    try {
      const res = await fetch(`/api/invitations/${id}/decline`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setInvites(prev => prev.filter(i => i.id !== id));
      } else {
        const j = await res.json().catch(() => ({}));
        console.error('Decline failed', j);
      }
    } catch (e) {
      console.error('Decline error', e);
    }
  };

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);

  if (loading) {
    return <div className="animate-pulse h-10 bg-muted rounded-md w-48"></div>;
  }

  return (
    <div className="space-y-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="truncate">
              {selectedWorkspace?.name || 'Select Workspace'}
            </span>
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => onWorkspaceSelect(workspace)}
              className="flex items-center justify-between"
            >
              <span className="truncate">{workspace.name}</span>
              {workspace.isPersonal && (
                <span className="text-xs text-muted-foreground ml-2">Personal</span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <CreateWorkspaceDialog onWorkspaceCreated={handleWorkspaceCreated} />
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={invitesOpen} onOpenChange={setInvitesOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start" size="sm">
            <div className="relative flex items-center">
              <Inbox className="h-4 w-4 mr-2" />
              Invitations
              {hasInvites && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full text-xs px-2 py-0.5 bg-primary text-primary-foreground">
                  {invites.length}
                </span>
              )}
            </div>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pending Invitations</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {!hasInvites && (
              <p className="text-sm text-muted-foreground">No pending invitations.</p>
            )}

            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">{inv.workspace.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Role: {inv.role.toLowerCase()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => acceptInvite(inv.id)}>
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => declineInvite(inv.id)}>
                    <X className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {selectedWorkspace && (
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" className="w-full justify-start" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Members
          </Button>
        </div>
      )}
    </div>
  );
}
