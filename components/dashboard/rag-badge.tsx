import { cn } from "@/lib/utils"
import type { RAGStatus } from "@/lib/dashboard"

const config: Record<RAGStatus, { label: string; classes: string }> = {
  green: { label: "On track", classes: "bg-emerald-100 text-emerald-800" },
  amber: { label: "Due soon", classes: "bg-amber-100 text-amber-800" },
  red: { label: "Urgent", classes: "bg-red-100 text-red-800" },
  breached: { label: "BREACHED", classes: "bg-red-600 text-white font-bold" },
}

export function RagBadge({ status }: { status: RAGStatus }) {
  const { label, classes } = config[status]
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs", classes)}>
      {label}
    </span>
  )
}
