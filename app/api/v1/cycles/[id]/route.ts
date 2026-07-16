import { NextRequest, NextResponse } from "next/server"
import { requireApiKey } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { serializeCycle } from "@/lib/api-v1/serializers"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiKey(req, { minScope: "READ" })
  if (!authResult.ok) return authResult.response
  const { org } = authResult

  const { id } = await params

  const cycle = await db.paymentCycle.findFirst({
    where: { id, paymentSchedule: { subcontractOrder: { organisationId: org.id } } },
    include: {
      application: true,
      assessment: { include: { lines: { orderBy: { sortOrder: "asc" } } } },
      paymentNotice: true,
      payLessNotice: true,
      paymentSchedule: {
        include: {
          subcontractOrder: {
            select: { id: true, reference: true, subcontractor: { select: { id: true, name: true } } },
          },
        },
      },
    },
  })

  if (!cycle) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    data: {
      ...serializeCycle(cycle),
      subcontract: {
        id: cycle.paymentSchedule.subcontractOrder.id,
        reference: cycle.paymentSchedule.subcontractOrder.reference,
        subcontractor: cycle.paymentSchedule.subcontractOrder.subcontractor,
      },
    },
  })
}
