"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { extendSchedule } from "@/lib/actions/schedule"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ExtendScheduleForm({
  orderId,
  currentEndDate,
}: {
  orderId: string
  currentEndDate: Date
}) {
  const [open, setOpen] = useState(false)
  const [newEndDate, setNewEndDate] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const minDate = new Date(currentEndDate)
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split("T")[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newEndDate) return
    setLoading(true)
    try {
      const result = await extendSchedule(orderId, newEndDate)
      toast.success(`Schedule extended — ${result.cyclesAdded} new cycle${result.cyclesAdded !== 1 ? "s" : ""} created`)
      setOpen(false)
      setNewEndDate("")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to extend schedule")
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Extend schedule
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 p-4 rounded-lg border bg-slate-50">
      <div>
        <Label className="text-xs">New end date</Label>
        <Input
          type="date"
          value={newEndDate}
          min={minDateStr}
          onChange={(e) => setNewEndDate(e.target.value)}
          className="mt-1 w-40"
          required
        />
      </div>
      <Button type="submit" disabled={loading} size="sm">
        {loading ? "Generating…" : "Confirm extension"}
      </Button>
      <button
        type="button"
        onClick={() => { setOpen(false); setNewEndDate("") }}
        className="text-xs text-slate-400 hover:text-slate-600"
      >
        Cancel
      </button>
      <p className="text-xs text-slate-400 self-center">
        New payment cycles will be generated from {currentEndDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}.
      </p>
    </form>
  )
}
