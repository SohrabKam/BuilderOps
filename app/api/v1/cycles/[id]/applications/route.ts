import { NextRequest, NextResponse } from "next/server"
import { requireApiKey } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { serializeApplication } from "@/lib/api-v1/serializers"
import { z } from "zod"

const CreateApplicationSchema = z.object({
  amountApplied: z.number().nonnegative(),
  dateReceived: z.string().refine((v) => !isNaN(Date.parse(v)), "dateReceived must be a valid date"),
  receivedVia: z.string().optional(),
  notes: z.string().optional(),
  attachmentUrl: z.string().url().optional(),
})

// Push an application into a payment cycle — the API equivalent of
// lib/actions/assessments.ts's logApplication(), for external systems that
// want to submit applications without going through the inbound-email flow.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiKey(req, { minScope: "WRITE" })
  if (!authResult.ok) return authResult.response
  const { org } = authResult

  const { id } = await params

  const body = CreateApplicationSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  const data = body.data

  const cycle = await db.paymentCycle.findFirst({
    where: { id, paymentSchedule: { subcontractOrder: { organisationId: org.id } } },
    include: { application: true, paymentSchedule: { include: { subcontractOrder: true } } },
  })
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })
  if (cycle.application) {
    return NextResponse.json({ error: "An application has already been logged for this cycle" }, { status: 409 })
  }

  const application = await db.application.create({
    data: {
      paymentCycleId: id,
      amountApplied: data.amountApplied,
      dateReceived: new Date(data.dateReceived),
      receivedVia: data.receivedVia ?? "api",
      notes: data.notes,
      attachmentUrl: data.attachmentUrl,
    },
  })

  await db.paymentCycle.update({ where: { id }, data: { status: "APPLICATION_RECEIVED" } })

  await db.auditEvent.create({
    data: {
      organisationId: org.id,
      subcontractOrderId: cycle.paymentSchedule.subcontractOrder.id,
      paymentCycleId: id,
      eventType: "application.received",
      payload: {
        source: "api",
        amountApplied: data.amountApplied,
        dateReceived: data.dateReceived,
        receivedVia: data.receivedVia ?? "api",
      },
    },
  })

  return NextResponse.json({ data: serializeApplication(application) }, { status: 201 })
}
