"use client"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"

interface Subtask {
  id: string
  title: string
  done: boolean
}

interface TaskCardProps {
  title: string
  subtitle?: string
  priority: "High" | "Medium" | "Low"
  subtasks: Subtask[]
}

export default function TaskCard({ title, subtitle, priority, subtasks }: TaskCardProps) {
  const completed = subtasks.filter((s) => s.done).length
  const total = Math.max(subtasks.length, 1)
  const percent = Math.round((completed / total) * 100)

  // Visuals tuned to the provided interface
  const dot =
    priority === "High" ? "bg-orange-500" :
    priority === "Medium" ? "bg-yellow-500" : "bg-green-500"

  const chipClass =
    priority === "High"
      ? "bg-orange-500/15 text-orange-400"
      : priority === "Medium"
      ? "bg-yellow-500/15 text-yellow-400"
      : "bg-green-500/15 text-green-400"

  return (
    <div
      className="rounded-lg border shadow-sm p-4"
      style={{
        background: "#2a2a4a",
        borderColor: "#3a3a5a",
      }}
    >
      {/* Priority chip like screenshot */}
      <div className="mb-3">
        <Badge variant="secondary" className={`${chipClass} border-0 px-2.5 py-1`}> 
          <span className={`mr-1 inline-block h-2 w-2 rounded-full ${dot}`} />
          {priority}
        </Badge>
      </div>

      <h3 className="font-medium mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-muted-foreground mb-3">{subtitle}</p>}

      {/* Progress bar with pink gradient */}
      <div className="mb-4">
        <div className="w-full h-1.5 rounded-full" style={{ background: "#1a1a2e" }}>
          <div
            className="h-1.5 rounded-full"
            style={{
              width: `${percent}%`,
              background: "linear-gradient(90deg, #ff1493 0%, #ff69b4 100%)",
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {subtasks.map((st) => (
          <label key={st.id} className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={st.done}
              readOnly
              className="border-border data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
            />
            <span className={st.done ? "text-green-500 line-through" : "text-white/70"}>
              {st.title}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
