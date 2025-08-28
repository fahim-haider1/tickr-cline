'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus, Settings, Users } from 'lucide-react';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Workspace {
  id: string;
  name: string;
  isPersonal: boolean;
}

interface WorkspaceSelectorProps {
  onWorkspaceSelect: (workspace: Workspace) => void;
  selectedWorkspaceId?: string;
}

export function WorkspaceSelector({ onWorkspaceSelect, selectedWorkspaceId }: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch('/api/workspaces');
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data);
        if (data.length > 0 && !selectedWorkspaceId) {
          onWorkspaceSelect(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceCreated = (newWorkspace: Workspace) => {
    setWorkspaces(prev => [...prev, newWorkspace]);
    onWorkspaceSelect(newWorkspace);
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