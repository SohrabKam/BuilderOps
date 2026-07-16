import { NextRequest, NextResponse } from "next/server"
import { requireApiKey } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { serializeSubcontract } from "@/lib/api-v1/serializers"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiKey(req, { minScope: "READ" })
  if (!authResult.ok) return authResult.response
  const { org } = authResult

  const { id } = await params

  const order = await db.subcontractOrder.findFirst({
    where: { id, organisationId: org.id },
    include: {
      project: { select: { id: true, name: true } },
      subcontractor: {
        select: {
          id: true,
          name: true,
          companyNumber: true,
          cisStatus: true,
          complianceDocs: true,
        },
      },
      retentionLedger: true,
    },
  })

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    data: {
      ...serializeSubcontract(order),
      retentionLedger: order.retentionLedger
        ? {
            totalHeld: Number(order.retentionLedger.totalHeld),
            pcReleaseDate: order.retentionLedger.pcReleaseDate,
            pcReleaseAmount:
              order.retentionLedger.pcReleaseAmount !== null ? Number(order.retentionLedger.pcReleaseAmount) : null,
            pcReleasedAt: order.retentionLedger.pcReleasedAt,
            mcdReleaseDate: order.retentionLedger.mcdReleaseDate,
            mcdReleaseAmount:
              order.retentionLedger.mcdReleaseAmount !== null ? Number(order.retentionLedger.mcdReleaseAmount) : null,
            mcdReleasedAt: order.retentionLedger.mcdReleasedAt,
          }
        : null,
    },
  })
}
