"use client"
import dynamic from "next/dynamic"
import type { ComponentProps } from "react"
import type { AssessmentWorkspace } from "./assessment-workspace"

const AssessmentWorkspaceDynamic = dynamic(
  () => import("./assessment-workspace").then((m) => m.AssessmentWorkspace),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-slate-400">
        Loading assessment grid…
      </div>
    ),
  }
)

export function AssessmentWorkspaceLoader(
  props: ComponentProps<typeof AssessmentWorkspace>
) {
  return <AssessmentWorkspaceDynamic {...props} />
}
