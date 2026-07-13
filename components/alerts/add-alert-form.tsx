"use client"
import { useState } from "react"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addAlertConfig } from "@/lib/actions/alerts"

const OFFSET_BASED_TYPES = ["DEADLINE_APPROACHING", "DOCUMENT_EXPIRY", "RETENTION_RELEASE"]

export function AddAlertForm() {
  const [open, setOpen] = useState(false)
  const [alertType, setAlertType] = useState("DEADLINE_APPROACHING")
  const [offsetDays, setOffsetDays] = useState("7")
  const [saving, setSaving] = useState(false)

  const needsOffset = OFFSET_BASED_TYPES.includes(alertType)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const days = needsOffset ? parseInt(offsetDays, 10) : 0
    if (needsOffset && (isNaN(days) || days < 0)) { toast.error("Enter a valid number of days"); return }
    setSaving(true)
    try {
      await addAlertConfig(alertType, days)
      toast.success("Alert rule added")
      setOpen(false)
      setOffsetDays("7")
    } catch {
      toast.error("Failed to add")
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5 mr-1" /> Add rule
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <select
        value={alertType}
        onChange={(e) => setAlertType(e.target.value)}
        className="rounded-md border border-input px-2 py-1.5 text-sm bg-background"
      >
        <option value="DEADLINE_APPROACHING">Deadline approaching</option>
        <option value="DOCUMENT_EXPIRY">Document expiry</option>
        <option value="RETENTION_RELEASE">Retention release</option>
        <option value="DAILY_DIGEST">Daily digest</option>
      </select>
      {needsOffset && (
        <>
          <input
            type="number"
            min={0}
            max={90}
            value={offsetDays}
            onChange={(e) => setOffsetDays(e.target.value)}
            className="w-16 rounded-md border border-input px-2 py-1.5 text-sm"
          />
          <span className="text-sm text-slate-500">days before</span>
        </>
      )}
      <Button type="submit" size="sm" disabled={saving}>{saving ? "Adding…" : "Add"}</Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
    </form>
  )
}
