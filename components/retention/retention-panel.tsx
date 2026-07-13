"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateRetentionDates, markRetentionReleased } from "@/lib/actions/retention"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDate } from "@/lib/dates/uk-bank-holidays"

type RetentionLedger = {
  id: string
  totalHeld: number | string
  pcReleaseDate: Date | string | null
  pcReleaseAmount: number | string | null
  pcReleasedAt: Date | string | null
  mcdReleaseDate: Date | string | null
  mcdReleaseAmount: number | string | null
  mcdReleasedAt: Date | string | null
}

export function RetentionPanel({
  orderId,
  ledger,
  contractSum,
  retentionPct,
}: {
  orderId: string
  ledger: RetentionLedger | null
  contractSum: number | string
  retentionPct: number | string
}) {
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const totalHeld = Number(ledger?.totalHeld ?? 0)
  const pct = Number(retentionPct) * 100
  const maxRetention = Number(contractSum) * Number(retentionPct)

  async function handleUpdateDates(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      await updateRetentionDates(fd)
      toast.success("Retention dates updated")
      setEditing(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMarkReleased(releaseType: "pc" | "mcd") {
    if (!confirm(`Mark ${releaseType.toUpperCase()} retention as released?`)) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.set("orderId", orderId)
      fd.set("releaseType", releaseType)
      await markRetentionReleased(fd)
      toast.success("Retention marked as released")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      {/* Summary */}
      <div className="rounded-lg border bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Retention summary</h3>
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Edit dates"}
          </Button>
        </div>
        <div className="space-y-2 text-sm">
          <Row label="Retention rate" value={`${pct.toFixed(0)}%`} />
          <Row label="Max retention" value={`£${maxRetention.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`} />
          <Row
            label="Currently held"
            value={`£${totalHeld.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`}
            bold
          />
        </div>
      </div>

      {/* PC Release */}
      <ReleaseCard
        title="Practical Completion (PC)"
        releaseDate={ledger?.pcReleaseDate ?? null}
        releaseAmount={ledger?.pcReleaseAmount ?? null}
        releasedAt={ledger?.pcReleasedAt ?? null}
        onMarkReleased={() => handleMarkReleased("pc")}
        submitting={submitting}
      />

      {/* MCD Release */}
      <ReleaseCard
        title="Making Good Defects (MCD)"
        releaseDate={ledger?.mcdReleaseDate ?? null}
        releaseAmount={ledger?.mcdReleaseAmount ?? null}
        releasedAt={ledger?.mcdReleasedAt ?? null}
        onMarkReleased={() => handleMarkReleased("mcd")}
        submitting={submitting}
      />

      {/* Edit form */}
      {editing && (
        <div className="rounded-lg border bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Set release dates</h3>
          <form onSubmit={handleUpdateDates} className="space-y-4">
            <input type="hidden" name="orderId" value={orderId} />
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-slate-700">PC Release</legend>
              <div className="grid grid-cols-2 gap-3 pl-3">
                <div>
                  <Label className="text-xs">Release date</Label>
                  <Input
                    name="pcReleaseDate"
                    type="date"
                    className="mt-1"
                    defaultValue={ledger?.pcReleaseDate
                      ? new Date(ledger.pcReleaseDate as string).toISOString().split("T")[0]
                      : ""}
                  />
                </div>
                <div>
                  <Label className="text-xs">Release amount (£)</Label>
                  <Input
                    name="pcReleaseAmount"
                    type="number"
                    step="0.01"
                    className="mt-1"
                    defaultValue={ledger?.pcReleaseAmount ? Number(ledger.pcReleaseAmount) : ""}
                  />
                </div>
              </div>
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-slate-700">MCD Release</legend>
              <div className="grid grid-cols-2 gap-3 pl-3">
                <div>
                  <Label className="text-xs">Release date</Label>
                  <Input
                    name="mcdReleaseDate"
                    type="date"
                    className="mt-1"
                    defaultValue={ledger?.mcdReleaseDate
                      ? new Date(ledger.mcdReleaseDate as string).toISOString().split("T")[0]
                      : ""}
                  />
                </div>
                <div>
                  <Label className="text-xs">Release amount (£)</Label>
                  <Input
                    name="mcdReleaseAmount"
                    type="number"
                    step="0.01"
                    className="mt-1"
                    defaultValue={ledger?.mcdReleaseAmount ? Number(ledger.mcdReleaseAmount) : ""}
                  />
                </div>
              </div>
            </fieldset>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save dates"}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between border-b pb-2 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={bold ? "font-bold text-slate-900" : "font-medium text-slate-700"}>{value}</span>
    </div>
  )
}

function ReleaseCard({
  title,
  releaseDate,
  releaseAmount,
  releasedAt,
  onMarkReleased,
  submitting,
}: {
  title: string
  releaseDate: Date | string | null
  releaseAmount: number | string | null
  releasedAt: Date | string | null
  onMarkReleased: () => void
  submitting: boolean
}) {
  const isReleased = !!releasedAt
  const isScheduled = !!releaseDate
  const now = new Date()
  const isDue = isScheduled && !isReleased && new Date(releaseDate as string) <= now

  return (
    <div
      className={`rounded-lg border p-4 text-sm ${
        isReleased
          ? "bg-emerald-50 border-emerald-200"
          : isDue
          ? "bg-amber-50 border-amber-200"
          : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-slate-900">{title}</p>
          {releaseDate ? (
            <p className="text-slate-500 mt-0.5">
              Due: {formatDate(new Date(releaseDate as string))}
              {releaseAmount
                ? ` — £${Number(releaseAmount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`
                : ""}
            </p>
          ) : (
            <p className="text-slate-400 mt-0.5">No date set</p>
          )}
          {releasedAt && (
            <p className="text-emerald-600 text-xs mt-1">
              Released {new Date(releasedAt as string).toLocaleDateString("en-GB")}
            </p>
          )}
        </div>
        {!isReleased && isScheduled && (
          <Button
            size="sm"
            variant="outline"
            onClick={onMarkReleased}
            disabled={submitting}
            className={isDue ? "border-amber-300 text-amber-700 hover:bg-amber-50" : ""}
          >
            Mark released
          </Button>
        )}
      </div>
    </div>
  )
}
