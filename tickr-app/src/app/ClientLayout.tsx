// src/app/ClientLayout.tsx
'use client';

import { UserSync } from '@/components/UserSync';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { PrimarySidebar } from '@/components/sidebar/PrimarySidebar';
import { useState, useEffect } from 'react';
import { UserButton, useUser } from '@clerk/nextjs';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  // Load workspaces on component mount
  useEffect(() => {
    fetch('/api/workspaces')
      .then(res => res.json())
      .then(data => {
        setWorkspaces(data);
        if (data.length > 0 && !selectedWorkspace) {
          setSelectedWorkspace(data[0].id);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading workspaces:', error);
        setLoading(false);
      });
  }, []);

  const handleWorkspaceCreate = async (name: string) => {
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description: '' }),
      });

      if (response.ok) {
        const newWorkspace = await response.json();
        setWorkspaces(prev => [...prev, newWorkspace]);
        setSelectedWorkspace(newWorkspace.id);
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <WorkspaceProvider>
      <div className="flex h-screen">
        <PrimarySidebar
          workspaces={workspaces}
          selectedWorkspace={selectedWorkspace}
          onWorkspaceSelect={setSelectedWorkspace}
          onWorkspaceCreate={handleWorkspaceCreate}
        />
        
        <main className="flex-1 flex flex-col">
          <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {workspaces.find(w => w.id === selectedWorkspace)?.name || 'Tickr'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {user && <UserButton afterSignOutUrl="/" />}
            </div>
          </header>
          
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </WorkspaceProvider>
  );
}