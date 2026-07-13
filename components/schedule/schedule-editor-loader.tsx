"use client"
import dynamic from "next/dynamic"
import type { ComponentProps } from "react"
import type { ScheduleEditor } from "./schedule-editor"

const ScheduleEditorDynamic = dynamic(
  () => import("./schedule-editor").then((m) => m.ScheduleEditor),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-slate-400">
        Loading schedule editor…
      </div>
    ),
  }
)

export function ScheduleEditorLoader(props: ComponentProps<typeof ScheduleEditor>) {
  return <ScheduleEditorDynamic {...props} />
}
