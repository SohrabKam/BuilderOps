"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { markCyclePaid } from "@/lib/actions/cycles"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

export function MarkPaidButton({ cycleId }: { cycleId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleClick() {
    if (!confirm("Mark this cycle as paid? This cannot be undone.")) return
    setLoading(true)
    try {
      await markCyclePaid(cycleId)
      toast.success("Cycle marked as paid")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} variant="outline" size="sm" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
      {loading ? "Saving…" : "Mark as paid"}
    </Button>
  )
}
