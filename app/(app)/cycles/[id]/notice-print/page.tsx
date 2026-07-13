import { requireOrg } from "@/lib/auth"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { formatDate } from "@/lib/dates/uk-bank-holidays"
import { PrintButton } from "./print-button"

export default async function NoticePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string }>
}) {
  const { id } = await params
  const { type } = await searchParams
  const noticeType = type === "payless" ? "payless" : "payment"

  const { org } = await requireOrg()

  const fullOrg = await db.organisation.findUnique({ where: { id: org.id } })

  const cycle = await db.paymentCycle.findFirst({
    where: {
      id,
      paymentSchedule: { subcontractOrder: { organisationId: org.id } },
    },
    include: {
      paymentNotice: true,
      payLessNotice: true,
      paymentSchedule: {
        include: {
          subcontractOrder: {
            include: { subcontractor: true, project: true },
          },
        },
      },
    },
  })

  if (!cycle) notFound()

  const notice = noticeType === "payment" ? cycle.paymentNotice : cycle.payLessNotice
  if (!notice || notice.status !== "SERVED") notFound()

  const order = cycle.paymentSchedule.subcontractOrder
  const noticeLabel = noticeType === "payment" ? "Payment Notice" : "Pay Less Notice"
  const servedAt = new Date(notice.servedAt as unknown as string)
  const sumDue = Number(notice.sumDue)
  const fmtGbp = (n: number) =>
    `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
        @media screen {
          body { background: #f1f5f9; }
          .notice-page { max-width: 720px; margin: 32px auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
        }
      `}</style>

      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <PrintButton />
        <a
          href={`/cycles/${id}`}
          className="inline-flex items-center px-3 py-1.5 rounded-md border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 shadow-sm"
        >
          ← Back
        </a>
      </div>

      <div className="notice-page" style={{ fontFamily: "sans-serif", color: "#1e293b" }}>
        {/* Header */}
        <div style={{ background: "#1e293b", padding: "20px 28px", borderRadius: "8px 8px 0 0" }}>
          <span style={{ color: "#fff", fontSize: "18px", fontWeight: 700 }}>{fullOrg?.name}</span>
          <span style={{ color: "#94a3b8", fontSize: "13px", marginLeft: "12px" }}>via NoticeGuard</span>
        </div>

        <div style={{ padding: "32px 28px" }}>
          <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 700 }}>{noticeLabel}</h1>
          <p style={{ margin: "0 0 28px", color: "#64748b", fontSize: "14px" }}>
            {order.reference} — Payment Cycle #{cycle.cycleNumber}
          </p>

          <p style={{ fontSize: "14px", lineHeight: 1.6 }}>Dear {order.subcontractor.name},</p>
          <p style={{ fontSize: "14px", lineHeight: 1.6, marginBottom: "20px" }}>
            {noticeType === "payment"
              ? "We hereby give you notice under the Housing Grants, Construction and Regeneration Act 1996 of the sum we propose to pay in respect of the above payment cycle."
              : "We hereby give you notice under the Housing Grants, Construction and Regeneration Act 1996 that we intend to pay less than the notified sum in respect of the above payment cycle."}
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", marginBottom: "20px" }}>
            <tbody>
              <TableRow label="Project" value={order.project.name} />
              <TableRow label="Subcontract reference" value={order.reference} />
              <TableRow label="Payment cycle" value={`#${cycle.cycleNumber}`} />
              <TableRow
                label={noticeType === "payment" ? "Sum proposed to be paid" : "Sum we intend to pay"}
                value={fmtGbp(sumDue)}
                bold
              />
              <TableRow label="Final date for payment" value={formatDate(new Date(cycle.finalDateForPayment))} />
              {noticeType === "payless" && (
                <TableRow label="Pay less notice date" value={formatDate(new Date(cycle.payLessDeadline))} />
              )}
              <TableRow
                label="Notice served"
                value={servedAt.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}
              />
            </tbody>
          </table>

          {notice.basis && (
            <div style={{ background: "#f8fafc", borderLeft: "3px solid #6366f1", padding: "12px 16px", marginBottom: "24px", borderRadius: "0 4px 4px 0" }}>
              <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Basis of assessment
              </p>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6 }}>{notice.basis}</p>
            </div>
          )}

          {order.signatory && (
            <p style={{ fontSize: "14px", color: "#1e293b", marginTop: "24px" }}>
              Yours faithfully,<br /><br />
              <strong>{order.signatory}</strong><br />
              <span style={{ color: "#64748b", fontSize: "13px" }}>{fullOrg?.name}</span>
            </p>
          )}

          <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "32px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
            Sent on behalf of {fullOrg?.fromName ?? fullOrg?.name} via NoticeGuard.
            This document is served for the purposes of the Housing Grants, Construction and Regeneration Act 1996.
            NoticeGuard does not provide legal advice.
          </p>
        </div>
      </div>
    </>
  )
}

function TableRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
      <td style={{ padding: "10px 0", color: "#64748b", width: "220px" }}>{label}</td>
      <td style={{ padding: "10px 0", fontWeight: bold ? 700 : 500, fontSize: bold ? "16px" : undefined }}>
        {value}
      </td>
    </tr>
  )
}
