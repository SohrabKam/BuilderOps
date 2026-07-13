"use server"
import { db } from "@/lib/db"

export async function completeOnboarding(formData: FormData) {
  const userId = formData.get("userId") as string
  const tenantId = formData.get("tenantId") as string
  const orgName = (formData.get("orgName") as string).trim()
  const fromName = (formData.get("fromName") as string).trim() || undefined
  const fromEmail = (formData.get("fromEmail") as string).trim() || undefined
  const memberName = formData.get("memberName") as string
  const memberEmail = formData.get("memberEmail") as string

  if (!orgName) throw new Error("Organisation name is required")

  // Guard against race-condition double-submits
  const existing = await db.organisation.findUnique({ where: { clerkOrgId: tenantId } })
  if (existing) return

  const org = await db.organisation.create({
    data: {
      clerkOrgId: tenantId,
      name: orgName,
      fromName: fromName ?? orgName,
      fromEmail,
      requiredDocTypes: ["Employers Liability", "Public Liability", "H&S Policy", "CIS Confirmation"],
    },
  })

  await db.orgMember.create({
    data: {
      clerkUserId: userId,
      organisationId: org.id,
      role: "ADMIN",
      name: memberName,
      email: memberEmail,
    },
  })

  await db.alertConfig.createMany({
    data: [
      { organisationId: org.id, alertType: "DEADLINE_APPROACHING", offsetDays: 5 },
      { organisationId: org.id, alertType: "DEADLINE_APPROACHING", offsetDays: 2 },
      { organisationId: org.id, alertType: "DEADLINE_APPROACHING", offsetDays: 0 },
      { organisationId: org.id, alertType: "DOCUMENT_EXPIRY", offsetDays: 30 },
      { organisationId: org.id, alertType: "DOCUMENT_EXPIRY", offsetDays: 14 },
      { organisationId: org.id, alertType: "DOCUMENT_EXPIRY", offsetDays: 7 },
      { organisationId: org.id, alertType: "RETENTION_RELEASE", offsetDays: 30 },
      { organisationId: org.id, alertType: "RETENTION_RELEASE", offsetDays: 14 },
      { organisationId: org.id, alertType: "RETENTION_RELEASE", offsetDays: 7 },
      { organisationId: org.id, alertType: "DAILY_DIGEST", offsetDays: 0 },
    ],
  })
}
