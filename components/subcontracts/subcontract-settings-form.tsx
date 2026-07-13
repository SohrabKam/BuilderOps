"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateSubcontractSettings, archiveSubcontract } from "@/lib/actions/subcontracts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SubcontractSettingsForm({
  orderId,
  description,
  signatory,
  noticeRecipients,
  contactEmails,
  contractSum,
  retentionPct,
  inboundEmail,
}: {
  orderId: string
  description: string
  signatory: string
  noticeRecipients: string[]
  contactEmails: string[]
  contractSum: number
  retentionPct: number
  inboundEmail: string
}) {
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      await updateSubcontractSettings(fd)
      toast.success("Settings saved")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-6 space-y-4">
        <h3 className="font-semibold text-slate-900">Contract settings</h3>
        <input type="hidden" name="orderId" value={orderId} />

        <div>
          <Label>Description</Label>
          <Input name="description" className="mt-1" defaultValue={description} placeholder="Groundworks package" />
        </div>

        <div>
          <Label>Authorised signatory</Label>
          <Input
            name="signatory"
            className="mt-1"
            defaultValue={signatory}
            placeholder="Jane Smith, Commercial Director"
          />
          <p className="text-xs text-slate-400 mt-1">
            Appears on payment and pay-less notices.
          </p>
        </div>

        <div>
          <Label>Subcontractor contact emails</Label>
          <Input
            name="contactEmails"
            className="mt-1"
            defaultValue={contactEmails.join(", ")}
            placeholder="accounts@sub.co.uk"
          />
          <p className="text-xs text-slate-400 mt-1">
            Comma-separated. Linked to this subcontractor across all their contracts.
          </p>
        </div>

        <div>
          <Label>Additional notice recipient emails</Label>
          <Input
            name="noticeRecipients"
            className="mt-1"
            defaultValue={noticeRecipients.join(", ")}
            placeholder="contracts@sub.co.uk, finance@sub.co.uk"
          />
          <p className="text-xs text-slate-400 mt-1">
            Comma-separated. Extra recipients for this contract only (e.g. main contractor CC).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Contract sum (£)</Label>
            <Input
              name="contractSum"
              type="number"
              step="0.01"
              className="mt-1"
              defaultValue={contractSum}
            />
          </div>
          <div>
            <Label>Retention (%)</Label>
            <Input
              name="retentionPct"
              type="number"
              step="0.1"
              min="0"
              max="100"
              className="mt-1"
              defaultValue={retentionPct.toFixed(1)}
            />
          </div>
        </div>

        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save settings"}
        </Button>
      </form>

      {inboundEmail && (
        <div className="rounded-lg border bg-slate-50 p-4 text-sm">
          <p className="font-medium text-slate-700 mb-1">Inbound application email</p>
          <p className="font-mono text-slate-900 text-xs break-all">{inboundEmail}</p>
          <p className="text-slate-400 text-xs mt-2">
            When the subcontractor emails their application to this address, NoticeGuard will automatically
            log it against the next open cycle.
          </p>
        </div>
      )}

      <ArchiveSection orderId={orderId} />
    </div>
  )
}

function ArchiveSection({ orderId }: { orderId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleArchive() {
    setSubmitting(true)
    try {
      await archiveSubcontract(orderId)
      toast.success("Subcontract archived")
      router.push("/subcontracts")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive")
      setSubmitting(false)
      setConfirming(false)
    }
  }

  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm">
      <p className="font-medium text-slate-700 mb-1">Archive subcontract</p>
      <p className="text-slate-500 text-xs mb-3">
        Removes this subcontract from the active view and dashboard. All historical data is preserved.
      </p>
      {confirming ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleArchive}
            disabled={submitting}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            {submitting ? "Archiving…" : "Yes, archive"}
          </Button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirming(true)}
          className="border-red-200 text-red-600 hover:bg-red-100"
        >
          Archive
        </Button>
      )}
    </div>
  )
}
