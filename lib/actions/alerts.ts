"use server"
import { requireOrgAction } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { toSafeErrorMessage } from "@/lib/prisma-error"

export async function toggleAlertConfig(id: string, enabled: boolean) {
  try {
    const { org } = await requireOrgAction()

    await db.alertConfig.updateMany({
      where: { id, organisationId: org.id },
      data: { enabled },
    })

    revalidatePath("/alerts")
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}

export async function addAlertConfig(alertType: string, offsetDays: number) {
  try {
    const { org } = await requireOrgAction()

    await db.alertConfig.create({
      data: {
        organisationId: org.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        alertType: alertType as any,
        offsetDays,
        enabled: true,
      },
    })

    revalidatePath("/alerts")
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}

export async function deleteAlertConfig(id: string) {
  try {
    const { org } = await requireOrgAction()

    await db.alertConfig.deleteMany({ where: { id, organisationId: org.id } })

    revalidatePath("/alerts")
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}
