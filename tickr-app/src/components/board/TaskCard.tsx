"use client"

interface TaskCardProps {
  title: string
  subtitle?: string
  priority: "High" | "Medium" | "Low"
}

export default function TaskCard({ title, subtitle, priority }: TaskCardProps) {
  const badge =
    priority === "High"
      ? "bg-red-500 text-white"
      : priority === "Medium"
      ? "bg-yellow-500 text-black"
      : "bg-green-500 text-white"

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 text-white shadow-md p-4 hover:shadow-lg transition">
      <span className={`px-2 py-1 text-xs rounded ${badge}`}>{priority}</span>
      <h3 className="mt-2 font-semibold text-lg">{title}</h3>
      {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
    </div>
  )
}
