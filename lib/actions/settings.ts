"use server"
import { requireOrgAction } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { toSafeErrorMessage } from "@/lib/prisma-error"
import type { Role } from "@/lib/generated/prisma/client"

export async function updateOrgSettings(formData: FormData) {
  try {
    const { org } = await requireOrgAction({ minRole: "ADMIN" })

    const name = (formData.get("name") as string).trim()
    const fromName = (formData.get("fromName") as string).trim() || null
    const fromEmail = (formData.get("fromEmail") as string).trim() || null

    if (!name) throw new Error("Organisation name is required")

    await db.organisation.update({
      where: { id: org.id },
      data: { name, fromName, fromEmail },
    })

    revalidatePath("/settings")
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}

export async function updateRequiredDocTypes(docTypes: string[]) {
  try {
    const { org } = await requireOrgAction({ minRole: "ADMIN" })

    const cleaned = docTypes.map((t) => t.trim()).filter(Boolean)

    await db.organisation.update({
      where: { id: org.id },
      data: { requiredDocTypes: cleaned },
    })

    revalidatePath("/settings")
    revalidatePath("/compliance")
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}

export async function updateMemberEscalation(memberId: string, escalationTo: string | null) {
  try {
    const { org } = await requireOrgAction({ minRole: "ADMIN" })

    await db.orgMember.updateMany({
      where: { id: memberId, organisationId: org.id },
      data: { escalationTo: escalationTo || null },
    })

    revalidatePath("/settings")
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}

// Sets a member's role directly in our own OrgMember table. Note this is a
// second way to change roles alongside Clerk's own org-role UI (Team page) —
// the Clerk webhook syncs Clerk-side role changes here too, keyed off a
// substring match against Clerk's role name ("admin"/"commercial"), so a
// Clerk-side change can overwrite a change made here and vice versa. This
// action exists because Clerk's *default* org roles are just admin/member
// with no "commercial" equivalent, so without a custom Clerk role configured
// in the dashboard, every invited member would otherwise be stuck at VIEWER
// with no in-app way to promote them.
export async function updateMemberRole(memberId: string, role: Role) {
  try {
    const { org, userId } = await requireOrgAction({ minRole: "ADMIN" })

    const member = await db.orgMember.findFirst({
      where: { id: memberId, organisationId: org.id },
    })
    if (!member) throw new Error("Member not found")

    // Prevent an admin from locking themselves (or, transitively, the org)
    // out by demoting their own only-admin account by mistake.
    if (member.clerkUserId === userId && role !== "ADMIN") {
      const otherAdmins = await db.orgMember.count({
        where: { organisationId: org.id, role: "ADMIN", id: { not: memberId } },
      })
      if (otherAdmins === 0) {
        throw new Error("Cannot demote yourself — you're the only Admin on this organisation")
      }
    }

    await db.orgMember.update({
      where: { id: memberId },
      data: { role },
    })

    revalidatePath("/settings")
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}
