'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Plus, ChevronRight, ChevronLeft } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  isPersonal: boolean;
}

interface PrimarySidebarProps {
  workspaces: Workspace[];
  selectedWorkspace: string;
  onWorkspaceSelect: (id: string) => void;
  onWorkspaceCreate: (name: string) => void;
}

export function PrimarySidebar({
  workspaces,
  selectedWorkspace,
  onWorkspaceSelect,
  onWorkspaceCreate
}: PrimarySidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useUser();

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    
    setIsCreating(true);
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newWorkspaceName.trim(),
          description: ''
        }),
      });

      if (response.ok) {
        const newWorkspace = await response.json();
        onWorkspaceSelect(newWorkspace.id);
        setNewWorkspaceName('');
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
      setIsCreating(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="h-screen bg-gray-100 border-r w-12 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 border-r w-64 flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">Workspaces</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {workspaces.map((workspace) => (
          <div
            key={workspace.id}
            className={`p-3 rounded-md cursor-pointer mb-1 transition-colors ${
              selectedWorkspace === workspace.id
                ? 'bg-blue-100 text-blue-800'
                : 'hover:bg-gray-200'
            }`}
            onClick={() => onWorkspaceSelect(workspace.id)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">
                {workspace.name}
              </span>
              {workspace.isPersonal && (
                <span className="text-xs text-gray-500 px-2 py-1 bg-gray-200 rounded">
                  Personal
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t">
        <div className="flex items-center space-x-2 mb-2">
          <input
            type="text"
            placeholder="New workspace..."
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            className="flex-1 text-sm px-2 py-1 border rounded"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateWorkspace()}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleCreateWorkspace}
            disabled={isCreating || !newWorkspaceName.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}