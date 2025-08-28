// User Types
export interface User {
  id: string
  email: string
  name?: string | null
  image?: string | null
  createdAt: Date
  updatedAt: Date
}

// Workspace Types
export interface Workspace {
  id: string
  name: string
  description?: string | null
  ownerId: string
  createdAt: Date
  updatedAt: Date
  members: WorkspaceMember[]
  columns: Column[]
}

export interface WorkspaceMember {
  id: string
  userId: string
  workspaceId: string
  role: WorkspaceRole
  joinedAt: Date
  user: User
}

export enum WorkspaceRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER'
}

// Column Types
export interface Column {
  id: string
  name: string
  order: number
  workspaceId: string
  createdAt: Date
  updatedAt: Date
  tasks: Task[]
}

// Task Types
export interface Task {
  id: string
  title: string
  description?: string | null
  priority: TaskPriority
  status: string
  order: number
  dueDate?: Date | null
  assigneeId?: string | null
  columnId: string
  createdAt: Date
  updatedAt: Date
  subtasks: Subtask[]
  assignee?: User | null
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

// Subtask Types
export interface Subtask {
  id: string
  title: string
  completed: boolean
  taskId: string
  order: number
  createdAt: Date
  updatedAt: Date
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Form Types
export interface CreateWorkspaceData {
  name: string
  description?: string
}

export interface CreateTaskData {
  title: string
  description?: string
  priority: TaskPriority
  assigneeId?: string
  dueDate?: Date
  subtasks?: { title: string }[]
}

export interface CreateColumnData {
  name: string
  workspaceId: string
}

// Filter Types
export interface TaskFilter {
  priority?: TaskPriority[]
  assignee?: string[]
  dueDate?: {
    from?: Date
    to?: Date
  }
  completion?: 'all' | 'completed' | 'incomplete'
}
