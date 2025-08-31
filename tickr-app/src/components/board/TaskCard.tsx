// tickr-app/src/components/board/TaskCard.tsx
"use client"

import { cn } from "@/lib/utils"

interface TaskCardProps {
  title: string
  subtitle?: string
  priority?: "High" | "Medium" | "Low"
  progress?: number // 0-100
}

export default function TaskCard({ title, subtitle, priority = "Low", progress }: TaskCardProps) {
  const priorityTint =
    priority === "High"
      ? "bg-destructive/20 text-destructive-foreground"
      : priority === "Medium"
      ? "bg-accent/20 text-accent-foreground"
      : "bg-secondary text-secondary-foreground"

  return (
    <div className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
      {priority && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            priorityTint,
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
          {priority}
        </span>
      )}

      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}

      {typeof progress === "number" && (
        <div className="mt-4">
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-primary to-chart-4"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
