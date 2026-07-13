import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { NextResponse } from "next/server"
import { db } from "./db"
import type { Organisation } from "./generated/prisma/client"

// Returns the Organisation record for the current user.
// Uses Clerk orgId if present, falls back to userId for personal accounts.
export async function requireOrg() {
  const { orgId, userId } = await auth()
  if (!userId) redirect("/sign-in")

  const tenantId = orgId ?? userId

  const org = await db.organisation.findUnique({ where: { clerkOrgId: tenantId } })
  if (!org) redirect("/onboarding")

  return { org, userId }
}

// Same resolution as requireOrg(), for use in "use server" actions where a
// redirect() isn't appropriate — throws instead, so the calling client
// component's try/catch + toast.error pattern picks up a clean message.
export async function requireOrgAction(): Promise<{ org: Organisation; userId: string }> {
  const { orgId, userId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  const tenantId = orgId ?? userId

  const org = await db.organisation.findUnique({ where: { clerkOrgId: tenantId } })
  if (!org) throw new Error("Organisation not found")

  return { org, userId }
}

// Same resolution again, for use in app/api/**/route.ts handlers, where the
// convention is a JSON error response rather than a throw or redirect.
// Usage: const result = await requireOrgRoute(); if (!result.ok) return result.response
export async function requireOrgRoute(): Promise<
  | { ok: true; org: Organisation; userId: string }
  | { ok: false; response: NextResponse }
> {
  const { orgId, userId } = await auth()
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  const tenantId = orgId ?? userId

  const org = await db.organisation.findUnique({ where: { clerkOrgId: tenantId } })
  if (!org) {
    return { ok: false, response: NextResponse.json({ error: "Organisation not found" }, { status: 404 }) }
  }

  return { ok: true, org, userId }
}
