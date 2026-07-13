import type { CycleStatus } from "@/lib/generated/prisma/client"
import { cn } from "@/lib/utils"

const labels: Record<CycleStatus, string> = {
  AWAITING_APPLICATION: "Awaiting application",
  APPLICATION_RECEIVED: "Application received",
  UNDER_ASSESSMENT: "Under assessment",
  NOTICE_SERVED: "Notice served",
  PAY_LESS_SERVED: "Pay-less served",
  PAID: "Paid",
  CLOSED: "Closed",
}

const classes: Record<CycleStatus, string> = {
  AWAITING_APPLICATION: "text-slate-500",
  APPLICATION_RECEIVED: "text-blue-600",
  UNDER_ASSESSMENT: "text-violet-600",
  NOTICE_SERVED: "text-emerald-600",
  PAY_LESS_SERVED: "text-orange-600",
  PAID: "text-slate-400",
  CLOSED: "text-slate-400",
}

export function CycleStatusLabel({ status }: { status: CycleStatus }) {
  return <span className={cn("text-xs font-medium", classes[status])}>{labels[status]}</span>
}
