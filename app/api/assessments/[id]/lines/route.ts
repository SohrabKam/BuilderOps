import { NextRequest, NextResponse } from "next/server"
import { requireOrgRoute } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { computeAssessmentTotals } from "@/lib/assessment-totals"

const PatchSchema = z.object({
  changes: z.array(
    z.object({
      lineId: z.string(),
      field: z.enum(["qtyOrPctComplete", "valueToDate", "notes"]),
      oldValue: z.any(),
      newValue: z.any(),
    })
  ),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const authResult = await requireOrgRoute()
  if (!authResult.ok) return authResult.response
  const { org, userId } = authResult

  const assessment = await db.assessment.findFirst({
    where: {
      id,
      paymentCycle: {
        paymentSchedule: {
          subcontractOrder: { organisationId: org.id },
        },
      },
    },
  })
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (assessment.isLocked) return NextResponse.json({ error: "Assessment is locked" }, { status: 403 })

  const body = PatchSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  const { changes } = body.data

  await Promise.all(
    changes.map((change) =>
      // Scoped by assessmentId (not just lineId) so a line belonging to a
      // different assessment/org can't be targeted by substituting its id.
      db.assessmentLine.updateMany({
        where: { id: change.lineId, assessmentId: id },
        data:
          change.field === "qtyOrPctComplete"
            ? { qtyOrPctComplete: change.newValue }
            : change.field === "valueToDate"
            ? { valueToDate: change.newValue }
            : { notes: change.newValue },
      })
    )
  )

  // Recalculate assessment totals. Ordered by sortOrder and excludes parent
  // (section/item) rows from the sum — their stored valueToDate is only set
  // once at assessment creation and never updated when a child is edited, so
  // summing it directly would double-count against the live children.
  const lines = await db.assessmentLine.findMany({
    where: { assessmentId: id },
    orderBy: { sortOrder: "asc" },
  })

  const cycle = await db.paymentCycle.findFirst({
    where: { assessment: { id } },
    include: {
      paymentSchedule: { include: { subcontractOrder: true } },
    },
  })
  const retPct = cycle ? Number(cycle.paymentSchedule.subcontractOrder.retentionPct) : 0.05

  const { gross, retention, prev, net } = computeAssessmentTotals(
    lines.map((l) => ({
      indentLevel: l.indentLevel,
      valueToDate: Number(l.valueToDate),
      previouslyCertified: Number(l.previouslyCertified),
    })),
    retPct
  )

  await db.assessment.update({
    where: { id },
    data: { grossValuation: gross, retentionAmount: retention, previouslyCert: prev, netThisCycle: net, lastSavedAt: new Date() },
  })

  await db.auditEvent.create({
    data: {
      organisationId: org.id,
      subcontractOrderId: cycle?.paymentSchedule.subcontractOrder.id,
      paymentCycleId: cycle?.id,
      userId,
      eventType: "assessment.saved",
      payload: { assessmentId: id, totals: { gross, retention, prev, net } },
    },
  })

  return NextResponse.json({ gross, retention, prev, net })
}
