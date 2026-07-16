import { NextRequest, NextResponse } from "next/server"
import { requireApiKey } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { serializeSubcontract } from "@/lib/api-v1/serializers"

const MAX_LIMIT = 100

export async function GET(req: NextRequest) {
  const authResult = await requireApiKey(req, { minScope: "READ" })
  if (!authResult.ok) return authResult.response
  const { org } = authResult

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get("limit")) || 20, MAX_LIMIT)
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0)
  const projectId = searchParams.get("projectId") ?? undefined
  const isActiveParam = searchParams.get("isActive")

  const where = {
    organisationId: org.id,
    ...(projectId ? { projectId } : {}),
    ...(isActiveParam !== null ? { isActive: isActiveParam === "true" } : {}),
  }

  const [orders, total] = await Promise.all([
    db.subcontractOrder.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        subcontractor: { select: { id: true, name: true, companyNumber: true, cisStatus: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.subcontractOrder.count({ where }),
  ])

  return NextResponse.json({
    data: orders.map(serializeSubcontract),
    pagination: { limit, offset, total },
  })
}
