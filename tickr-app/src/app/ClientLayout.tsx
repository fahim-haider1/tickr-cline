// src/app/ClientLayout.tsx
'use client';

import { UserSync } from '@/components/UserSync';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { PrimarySidebar } from '@/components/sidebar/PrimarySidebar';
import { useState, useEffect } from 'react';
import { UserButton } from '@clerk/nextjs';
import Image from 'next/image'; // Add this import

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load workspaces on component mount
  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch('/api/workspaces');
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data);
        if (data.length > 0 && !selectedWorkspace) {
          setSelectedWorkspace(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

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
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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
            {/* Logo using Next.js Image component - Fixed */}
            <div className="flex items-center space-x-4">
              <Image 
                src="/images/Group 5 (2).svg" 
                alt="Tickr Logo" 
                width={60} 
                height={60}
                className="h-18 w-18"
              />
              {/* <div>
                <h1 className="text-xl font-bold">
                  {workspaces.find(w => w.id === selectedWorkspace)?.name || 'Tickr'}
                </h1>
              </div> */}
            </div>
            
            <div className="flex items-center space-x-4">
              <UserButton />
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