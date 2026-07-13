"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/dates/uk-bank-holidays"

type Notice = {
  id: string
  status: string
  sumDue: number | string
  basis: string | null
  servedAt: Date | string | null
  serviceMethod: string | null
}

type Assessment = {
  id: string
  grossValuation: number | string
  retentionAmount: number | string
  previouslyCert: number | string
  netThisCycle: number | string
}

export function NoticePanel({
  cycleId,
  cycleStatus,
  paymentNotice,
  payLessNotice,
  assessment,
  subcontractorName,
  paymentNoticeDeadline,
  payLessDeadline,
  finalDateForPayment,
}: {
  cycleId: string
  cycleStatus: string
  paymentNotice: Notice | null
  payLessNotice: Notice | null
  assessment: Assessment | null
  subcontractorName: string
  paymentNoticeDeadline: Date
  payLessDeadline: Date
  finalDateForPayment: Date
}) {
  const router = useRouter()

  if (cycleStatus === "PAID" || cycleStatus === "CLOSED") {
    const label = cycleStatus === "PAID" ? "paid" : "closed"
    return (
      <div className="rounded-lg border-2 border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
        This cycle has been marked as {label}. No further notices can be served.
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="rounded-lg border-2 border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
        Complete the assessment before serving notices.
      </div>
    )
  }

  const net = Number(assessment.netThisCycle)

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Payment notice */}
      <NoticeCard
        title="Payment notice"
        deadline={paymentNoticeDeadline}
        notice={paymentNotice}
        cycleId={cycleId}
        type="payment"
        proposedSum={net}
        subcontractorName={subcontractorName}
        onServed={() => router.refresh()}
      />

      {/* Pay-less notice */}
      <NoticeCard
        title="Pay-less notice"
        deadline={payLessDeadline}
        notice={payLessNotice}
        cycleId={cycleId}
        type="payless"
        proposedSum={net}
        subcontractorName={subcontractorName}
        onServed={() => router.refresh()}
      />

      {/* Final date callout */}
      <div className="rounded-lg bg-slate-50 border px-4 py-3 text-sm flex justify-between items-center">
        <span className="text-slate-500">Final date for payment</span>
        <span className="font-semibold text-slate-900">{formatDate(finalDateForPayment)}</span>
      </div>
    </div>
  )
}

function NoticeCard({
  title,
  deadline,
  notice,
  cycleId,
  type,
  proposedSum,
  subcontractorName,
  onServed,
}: {
  title: string
  deadline: Date
  notice: Notice | null
  cycleId: string
  type: "payment" | "payless"
  proposedSum: number
  subcontractorName: string
  onServed: () => void
}) {
  const [serving, setServing] = useState(false)
  const [sumDue, setSumDue] = useState(proposedSum.toFixed(2))
  const [basis, setBasis] = useState("")
  const [serviceMethod, setServiceMethod] = useState<"EMAIL" | "POST" | "HAND">("EMAIL")
  const now = new Date()
  const isPast = deadline < now

  if (notice?.status === "SERVED") {
    const printType = type === "payment" ? "payment" : "payless"
    return (
      <div className="rounded-lg border bg-emerald-50 border-emerald-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-emerald-800">{title} — served</h3>
          <div className="flex items-center gap-2">
            <a
              href={`/cycles/${cycleId}/notice-print?type=${printType}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
            >
              View / Print
            </a>
            <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Served</span>
          </div>
        </div>
        <div className="text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Sum due</span>
            <span className="font-medium">£{Number(notice.sumDue).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Served at</span>
            <span className="font-medium">
              {notice.servedAt
                ? new Date(notice.servedAt as string).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
                : "—"}
            </span>
          </div>
          {notice.serviceMethod && (
            <div className="flex justify-between">
              <span className="text-slate-500">Service method</span>
              <span className="font-medium capitalize">{notice.serviceMethod.toLowerCase().replace("_", " ")}</span>
            </div>
          )}
          {notice.basis && (
            <div className="border-t pt-2 mt-2">
              <p className="text-slate-500 text-xs">Basis</p>
              <p className="text-slate-700 mt-0.5">{notice.basis}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  async function handleServe() {
    setServing(true)
    try {
      const res = await fetch(`/api/cycles/${cycleId}/notices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, sumDue: parseFloat(sumDue), basis, serviceMethod }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to serve notice")
      }
      toast.success(`${title} marked as served`)
      onServed()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed")
    } finally {
      setServing(false)
    }
  }

  return (
    <div className={`rounded-lg border p-5 bg-white ${isPast && !notice ? "border-red-200" : ""}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className={`text-xs mt-0.5 ${isPast ? "text-red-500 font-medium" : "text-slate-400"}`}>
            Deadline: {formatDate(deadline)}{isPast ? " — OVERDUE" : ""}
          </p>
        </div>
        {!notice && (
          <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Not served</span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Sum due (£)</label>
          <input
            type="number"
            step="0.01"
            value={sumDue}
            onChange={(e) => setSumDue(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Basis / narrative</label>
          <textarea
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
            rows={3}
            placeholder={`Assessment of works completed to ${new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`}
            className="mt-1 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Service method</label>
          <select
            value={serviceMethod}
            onChange={(e) => setServiceMethod(e.target.value as "EMAIL" | "POST" | "HAND")}
            className="mt-1 block w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="EMAIL">Email (notice emailed to recipient)</option>
            <option value="POST">Post (notice sent by post)</option>
            <option value="HAND">Hand delivery (notice delivered in person)</option>
          </select>
          {serviceMethod !== "EMAIL" && (
            <p className="text-xs text-amber-600 mt-1">
              No email will be sent automatically. Ensure the notice is delivered by the selected method.
            </p>
          )}
        </div>
        <Button onClick={handleServe} disabled={serving} className="w-full">
          {serving ? "Recording…" : `Mark ${title} as served`}
        </Button>
        <p className="text-xs text-center text-slate-400">
          This records the service event with a timestamp. Ensure you have actually served the notice to {subcontractorName}.
        </p>
      </div>
    </div>
  )
}
