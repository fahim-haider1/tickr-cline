"use client"

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
  const badge =
    priority === "High"
      ? "bg-red-500 text-white"
      : priority === "Medium"
      ? "bg-yellow-500 text-black"
      : "bg-green-500 text-white"

  const completed = subtasks.filter(s => s.done).length
  const total = subtasks.length || 1
  const percent = Math.round((completed / total) * 100)

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 text-white shadow-md p-4 hover:shadow-lg transition">
      <span className={`px-2 py-1 text-xs rounded ${badge}`}>{priority}</span>
      <h3 className="mt-2 font-semibold text-lg">{title}</h3>
      {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}

      {/* ✅ Progress Bar */}
      <div className="mt-3 h-2 w-full bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* ✅ Subtasks */}
      <ul className="mt-3 space-y-1">
        {subtasks.map(st => (
          <li key={st.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={st.done} readOnly className="accent-fuchsia-500" />
            <span className={st.done ? "line-through text-gray-400" : ""}>{st.title}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
