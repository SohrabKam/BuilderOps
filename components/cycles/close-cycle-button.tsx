"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { closeCycle } from "@/lib/actions/cycles"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"

export function CloseCycleButton({ cycleId }: { cycleId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleClose() {
    if (!reason.trim()) {
      toast.error("Please enter a reason for closing this cycle")
      return
    }
    setLoading(true)
    try {
      await closeCycle(cycleId, reason.trim())
      toast.success("Cycle closed")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed")
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1"
      >
        <XCircle className="w-3.5 h-3.5" />
        Close cycle
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for closing…"
        className="text-xs border border-slate-200 rounded px-2 py-1 w-48 focus:outline-none focus:ring-1 focus:ring-slate-300"
        onKeyDown={(e) => { if (e.key === "Enter") handleClose(); if (e.key === "Escape") setOpen(false) }}
      />
      <Button
        size="sm"
        variant="outline"
        onClick={handleClose}
        disabled={loading}
        className="border-slate-300 text-slate-600 text-xs h-7"
      >
        {loading ? "Closing…" : "Confirm"}
      </Button>
      <button onClick={() => setOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">
        Cancel
      </button>
    </div>
  )
}
