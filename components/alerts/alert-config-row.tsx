"use client"
import { useState } from "react"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { toggleAlertConfig, deleteAlertConfig } from "@/lib/actions/alerts"

const ALERT_LABELS: Record<string, string> = {
  DEADLINE_APPROACHING: "Deadline approaching",
  DEADLINE_BREACHED: "Deadline breached",
  DOCUMENT_EXPIRY: "Document expiry",
  RETENTION_RELEASE: "Retention release",
  DAILY_DIGEST: "Daily digest",
}

export function AlertConfigRow({
  id,
  alertType,
  offsetDays,
  enabled,
}: {
  id: string
  alertType: string
  offsetDays: number
  enabled: boolean
}) {
  const [on, setOn] = useState(enabled)
  const [busy, setBusy] = useState(false)

  async function handleToggle() {
    setBusy(true)
    try {
      await toggleAlertConfig(id, !on)
      setOn((v) => !v)
    } catch {
      toast.error("Failed to update")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Remove this alert rule?")) return
    setBusy(true)
    try {
      await deleteAlertConfig(id)
    } catch {
      toast.error("Failed to delete")
      setBusy(false)
    }
  }

  return (
    <tr className={`hover:bg-slate-50 ${!on ? "opacity-60" : ""}`}>
      <td className="px-4 py-3 font-medium">{ALERT_LABELS[alertType] ?? alertType}</td>
      <td className="px-4 py-3 text-slate-500">
        {alertType === "DAILY_DIGEST" ? "Daily at 7am" : offsetDays === 0 ? "On the day" : `${offsetDays} days before`}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={handleToggle}
          disabled={busy}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
            on ? "bg-indigo-600" : "bg-slate-200"
          }`}
          aria-label={on ? "Disable" : "Enable"}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              on ? "translate-x-4" : "translate-x-1"
            }`}
          />
        </button>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={handleDelete}
          disabled={busy}
          className="text-slate-300 hover:text-red-500 transition-colors"
          aria-label="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  )
}
