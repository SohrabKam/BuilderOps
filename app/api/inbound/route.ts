import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// Parses amount from email subject/body using multiple patterns
function parseAmount(text: string): number | null {
  // Matches: £75,000 | £75000 | 75,000.00 | 75000 | £ 75,000
  const patterns = [
    /£\s*([\d,]+(?:\.\d{1,2})?)/,
    /GBP\s*([\d,]+(?:\.\d{1,2})?)/i,
    /amount[:\s]+£?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /application[:\s]+£?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /sum[:\s]+£?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /value[:\s]+£?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /total[:\s]+£?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const cleaned = match[1].replace(/,/g, "")
      const value = parseFloat(cleaned)
      if (!isNaN(value) && value > 0) return value
    }
  }
  return null
}

// Resend inbound email webhook payload shape
type ResendInboundPayload = {
  to?: Array<{ email: string }> | string
  from?: { email: string } | string
  subject?: string
  text?: string
  html?: string
}

export async function POST(req: NextRequest) {
  const secret = process.env.INBOUND_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: "Inbound webhook secret not configured" }, { status: 500 })
  }
  const sig = req.headers.get("x-webhook-secret") ?? req.headers.get("x-resend-signature")
  if (sig !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: ResendInboundPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Normalise recipient
  const toEmail =
    typeof payload.to === "string"
      ? payload.to
      : Array.isArray(payload.to)
      ? payload.to[0]?.email
      : undefined

  if (!toEmail) return NextResponse.json({ error: "No recipient" }, { status: 400 })

  // Find the order by inbound email
  const order = await db.subcontractOrder.findUnique({
    where: { inboundEmail: toEmail.toLowerCase() },
    include: {
      paymentSchedule: {
        include: {
          cycles: {
            where: { status: "AWAITING_APPLICATION" },
            orderBy: { cycleNumber: "asc" },
            take: 1,
          },
        },
      },
    },
  })

  if (!order) {
    return NextResponse.json({ error: "No order for this address" }, { status: 404 })
  }

  const cycle = order.paymentSchedule?.cycles[0]
  if (!cycle) {
    return NextResponse.json({ error: "No open cycle awaiting application" }, { status: 409 })
  }

  // Try to extract amount from subject then body
  const searchText = [payload.subject ?? "", payload.text ?? "", payload.html ?? ""].join(" ")
  const amountApplied = parseAmount(searchText)

  const fromEmail =
    typeof payload.from === "string" ? payload.from : (payload.from as { email: string })?.email ?? ""

  await db.application.create({
    data: {
      paymentCycleId: cycle.id,
      amountApplied: amountApplied ?? 0,
      dateReceived: new Date(),
      receivedVia: "email",
      notes: amountApplied
        ? `Auto-parsed from inbound email (${fromEmail}). Subject: "${payload.subject ?? ""}"`
        : `Email received — amount could not be parsed. Please update manually. From: ${fromEmail}`,
    },
  })

  await db.paymentCycle.update({
    where: { id: cycle.id },
    data: { status: "APPLICATION_RECEIVED" },
  })

  await db.auditEvent.create({
    data: {
      organisationId: order.organisationId,
      subcontractOrderId: order.id,
      paymentCycleId: cycle.id,
      eventType: "application.received",
      payload: {
        source: "inbound_email",
        from: fromEmail,
        subject: payload.subject,
        amountApplied: amountApplied ?? null,
        parsed: !!amountApplied,
      },
    },
  })

  return NextResponse.json({
    ok: true,
    cycleId: cycle.id,
    amountApplied,
    parsed: !!amountApplied,
  })
}
