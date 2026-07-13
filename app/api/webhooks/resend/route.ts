import { NextRequest, NextResponse } from "next/server"
import { Webhook } from "svix"
import { db } from "@/lib/db"

// Resend sends delivery events for sent emails.
// We use deliveryLogId stored on notices to match back to the correct record.
// This creates an audit trail for compliance (proof of delivery/bounce).

type ResendWebhookEvent = {
  type: string
  data: {
    email_id: string
    from?: string
    to?: string[]
    subject?: string
    bounced_at?: string
    clicked_at?: string
    delivered_at?: string
    created_at?: string
  }
}

export async function POST(req: NextRequest) {
  // Resend delivers webhooks signed via Svix — same verification mechanism
  // as the Clerk handler. Fails closed if the secret isn't configured.
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })

  const svix = new Webhook(secret)
  const body = await req.text()
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  }

  let event: ResendWebhookEvent
  try {
    event = svix.verify(body, headers) as ResendWebhookEvent
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const { type, data } = event
  const emailId = data.email_id

  if (!emailId) return NextResponse.json({ ok: true })

  // Map Resend event type to an audit event label
  const eventMap: Record<string, string> = {
    "email.sent": "notice.email.sent",
    "email.delivered": "notice.email.delivered",
    "email.delivery_delayed": "notice.email.delayed",
    "email.bounced": "notice.email.bounced",
    "email.complained": "notice.email.complained",
  }
  const eventType = eventMap[type]
  if (!eventType) return NextResponse.json({ ok: true })

  // Try to find a notice matched by deliveryLogId
  const [paymentNotice, payLessNotice] = await Promise.all([
    db.paymentNotice.findFirst({ where: { deliveryLogId: emailId } }),
    db.payLessNotice.findFirst({ where: { deliveryLogId: emailId } }),
  ])

  const notice = paymentNotice ?? payLessNotice
  if (!notice) {
    // No matching notice — still record the event but without cycle linkage
    return NextResponse.json({ ok: true, matched: false })
  }

  // Find the cycle so we can get org/order IDs for the audit event
  const cycle = await db.paymentCycle.findUnique({
    where: { id: notice.paymentCycleId },
    include: {
      paymentSchedule: { include: { subcontractOrder: true } },
    },
  })

  if (cycle) {
    await db.auditEvent.create({
      data: {
        organisationId: cycle.paymentSchedule.subcontractOrder.organisationId,
        subcontractOrderId: cycle.paymentSchedule.subcontractOrder.id,
        paymentCycleId: cycle.id,
        eventType,
        payload: {
          emailId,
          to: data.to,
          subject: data.subject,
          noticeType: paymentNotice ? "payment" : "payless",
          timestamp: data.delivered_at ?? data.bounced_at ?? data.created_at,
        },
      },
    })
  }

  return NextResponse.json({ ok: true, matched: true, eventType })
}
