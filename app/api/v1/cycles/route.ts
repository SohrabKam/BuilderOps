import { NextRequest, NextResponse } from "next/server"
import { requireApiKey } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { serializeCycle } from "@/lib/api-v1/serializers"
import type { CycleStatus } from "@/lib/generated/prisma/client"

const MAX_LIMIT = 100
const VALID_STATUSES: CycleStatus[] = [
  "AWAITING_APPLICATION",
  "APPLICATION_RECEIVED",
  "UNDER_ASSESSMENT",
  "NOTICE_SERVED",
  "PAY_LESS_SERVED",
  "PAID",
  "CLOSED",
]

export async function GET(req: NextRequest) {
  const authResult = await requireApiKey(req, { minScope: "READ" })
  if (!authResult.ok) return authResult.response
  const { org } = authResult

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get("limit")) || 20, MAX_LIMIT)
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0)
  const subcontractId = searchParams.get("subcontractId") ?? undefined
  const statusParam = searchParams.get("status")

  if (statusParam && !VALID_STATUSES.includes(statusParam as CycleStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    )
  }

  const where = {
    paymentSchedule: {
      subcontractOrder: {
        organisationId: org.id,
        ...(subcontractId ? { id: subcontractId } : {}),
      },
    },
    ...(statusParam ? { status: statusParam as CycleStatus } : {}),
  }

  const [cycles, total] = await Promise.all([
    db.paymentCycle.findMany({
      where,
      include: { application: true, assessment: true, paymentNotice: true, payLessNotice: true },
      orderBy: { paymentNoticeDeadline: "asc" },
      take: limit,
      skip: offset,
    }),
    db.paymentCycle.count({ where }),
  ])

  return NextResponse.json({
    data: cycles.map(serializeCycle),
    pagination: { limit, offset, total },
  })
}
