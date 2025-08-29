// src/lib/workspaceAuth.ts
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export async function requireWorkspaceAuth(
  workspaceId: string,
  requiredRole?: 'ADMIN' | 'MEMBER' | 'VIEWER'
) {
  const user = await currentUser();
  
  if (!user) {
    return { error: 'Authentication required', status: 401 };
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId
      }
    }
  });

  if (!membership) {
    return { error: 'Workspace access denied', status: 403 };
  }

  // Role-based access control
  if (requiredRole) {
    const roleHierarchy = { 'VIEWER': 0, 'MEMBER': 1, 'ADMIN': 2 };
    
    if (roleHierarchy[membership.role] < roleHierarchy[requiredRole]) {
      return { error: 'Insufficient permissions', status: 403 };
    }
  }

  return { 
    success: true, 
    user, 
    membership,
    hasRole: (role: string) => membership.role === role
  };
}

// Helper function to check specific permissions
export async function checkWorkspacePermission(
  workspaceId: string,
  requiredPermission: string
) {
  const authResult = await requireWorkspaceAuth(workspaceId);
  
  if (!authResult.success) {
    return authResult;
  }

  const { membership } = authResult;

  // Permission checks based on role
  switch (requiredPermission) {
    case 'manage_members':
      return { 
        allowed: membership.role === 'ADMIN',
        error: membership.role !== 'ADMIN' ? 'Admin required' : undefined
      };
    
    case 'create_tasks':
      return { 
        allowed: membership.role === 'ADMIN' || membership.role === 'MEMBER',
        error: membership.role === 'VIEWER' ? 'Viewers cannot create tasks' : undefined
      };
    
    case 'edit_tasks':
      return { 
        allowed: membership.role === 'ADMIN' || membership.role === 'MEMBER',
        error: membership.role === 'VIEWER' ? 'Viewers cannot edit tasks' : undefined
      };
    
    case 'delete_tasks':
      return { 
        allowed: membership.role === 'ADMIN' || membership.role === 'MEMBER',
        error: membership.role === 'VIEWER' ? 'Viewers cannot delete tasks' : undefined
      };
    
    default:
      return { allowed: false, error: 'Unknown permission' };
  }
}