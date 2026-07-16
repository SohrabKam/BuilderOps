import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { NextResponse } from "next/server"
import { db } from "./db"
import { roleMeets } from "./roles"
import type { Organisation, Role } from "./generated/prisma/client"

// Resolves the caller's role within an org. No OrgMember row (e.g. Clerk
// org-membership webhook hasn't synced yet) is treated as VIEWER — the
// least-privileged role — rather than granting access by default.
async function resolveRole(clerkUserId: string, organisationId: string): Promise<Role> {
  const member = await db.orgMember.findUnique({
    where: { clerkUserId_organisationId: { clerkUserId, organisationId } },
  })
  return member?.role ?? "VIEWER"
}

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
// Pass `minRole` to also enforce a minimum role (VIEWER < COMMERCIAL < ADMIN);
// omit it for actions any authenticated org member may perform.
export async function requireOrgAction(opts?: {
  minRole?: Role
}): Promise<{ org: Organisation; userId: string; role: Role }> {
  const { orgId, userId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  const tenantId = orgId ?? userId

  const org = await db.organisation.findUnique({ where: { clerkOrgId: tenantId } })
  if (!org) throw new Error("Organisation not found")

  const role = await resolveRole(userId, org.id)
  if (opts?.minRole && !roleMeets(role, opts.minRole)) {
    throw new Error(`Forbidden — requires ${opts.minRole} role or higher`)
  }

  return { org, userId, role }
}

// Same resolution again, for use in app/api/**/route.ts handlers, where the
// convention is a JSON error response rather than a throw or redirect.
// Usage: const result = await requireOrgRoute(); if (!result.ok) return result.response
export async function requireOrgRoute(opts?: {
  minRole?: Role
}): Promise<
  | { ok: true; org: Organisation; userId: string; role: Role }
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

  const role = await resolveRole(userId, org.id)
  if (opts?.minRole && !roleMeets(role, opts.minRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Forbidden — requires ${opts.minRole} role or higher` },
        { status: 403 }
      ),
    }
  }

  return { ok: true, org, userId, role }
}
