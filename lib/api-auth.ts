import { NextRequest, NextResponse } from "next/server"
import { db } from "./db"
import { hashApiKey } from "./api-keys"
import type { ApiKeyScope, Organisation } from "./generated/prisma/client"

const SCOPE_RANK: Record<ApiKeyScope, number> = { READ: 0, WRITE: 1 }

function scopeMeets(scope: ApiKeyScope, minScope: ApiKeyScope): boolean {
  return SCOPE_RANK[scope] >= SCOPE_RANK[minScope]
}

// Authenticates a request to /api/v1/** via `Authorization: Bearer <key>`,
// the external-integration equivalent of requireOrgRoute(). WRITE-scoped
// keys can do everything a READ-scoped key can (same ranking idea as Role).
export async function requireApiKey(
  req: NextRequest,
  opts: { minScope: ApiKeyScope }
): Promise<{ ok: true; org: Organisation } | { ok: false; response: NextResponse }> {
  const authHeader = req.headers.get("authorization") ?? ""
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing or malformed Authorization header — expected: Authorization: Bearer <api key>" },
        { status: 401 }
      ),
    }
  }

  const hash = hashApiKey(match[1].trim())
  const key = await db.apiKey.findUnique({ where: { keyHash: hash }, include: { organisation: true } })

  if (!key || key.revokedAt) {
    return { ok: false, response: NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 }) }
  }

  if (!scopeMeets(key.scope, opts.minScope)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Forbidden — this key has ${key.scope} scope, ${opts.minScope} scope required` },
        { status: 403 }
      ),
    }
  }

  await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })

  return { ok: true, org: key.organisation }
}
