"use server"
import { requireOrgAction } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { toSafeErrorMessage } from "@/lib/prisma-error"

export async function updateOrgSettings(formData: FormData) {
  try {
    const { org } = await requireOrgAction()

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
    const { org } = await requireOrgAction()

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
    const { org } = await requireOrgAction()

    await db.orgMember.updateMany({
      where: { id: memberId, organisationId: org.id },
      data: { escalationTo: escalationTo || null },
    })

    revalidatePath("/settings")
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}
