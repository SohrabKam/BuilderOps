"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { setMilestoneApplicationDate } from "@/lib/actions/cycles"
import { Button } from "@/components/ui/button"
import { CalendarDays } from "lucide-react"

export function MilestoneDateEditor({
  cycleId,
  currentDate,
}: {
  cycleId: string
  currentDate: Date
}) {
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState(currentDate.toISOString().split("T")[0])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSave() {
    if (!date) return
    setLoading(true)
    try {
      await setMilestoneApplicationDate(cycleId, date)
      toast.success("Application date set — all deadlines recalculated")
      setEditing(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set date")
    } finally {
      setLoading(false)
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
      >
        <CalendarDays className="w-3 h-3" />
        Set date
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300"
      />
      <Button size="sm" onClick={handleSave} disabled={loading} className="h-7 text-xs">
        {loading ? "Saving…" : "Apply"}
      </Button>
      <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:text-slate-600">
        Cancel
      </button>
    </div>
  )
}
