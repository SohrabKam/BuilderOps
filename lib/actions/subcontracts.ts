"use server"
import { requireOrgAction } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { toSafeErrorMessage } from "@/lib/prisma-error"

const UpdateOrderSchema = z.object({
  orderId: z.string().min(1),
  description: z.string().optional(),
  signatory: z.string().optional(),
  noticeRecipients: z.string().optional(),
  contactEmails: z.string().optional(),
  contractSum: z.coerce.number().positive().optional(),
  retentionPct: z.coerce.number().min(0).max(100).optional(),
})

export async function updateSubcontractSettings(formData: FormData) {
  try {
    const { org, userId } = await requireOrgAction({ minRole: "COMMERCIAL" })

    const raw = {
      orderId: formData.get("orderId") as string,
      description: (formData.get("description") as string) || undefined,
      signatory: (formData.get("signatory") as string) || undefined,
      noticeRecipients: (formData.get("noticeRecipients") as string) || undefined,
      contactEmails: (formData.get("contactEmails") as string) || undefined,
      contractSum: formData.get("contractSum") ? Number(formData.get("contractSum")) : undefined,
      retentionPct: formData.get("retentionPct") ? Number(formData.get("retentionPct")) : undefined,
    }

    const data = UpdateOrderSchema.parse(raw)

    const order = await db.subcontractOrder.findFirst({
      where: { id: data.orderId, organisationId: org.id },
      include: { subcontractor: true },
    })
    if (!order) throw new Error("Order not found")

    const recipients = data.noticeRecipients
      ? data.noticeRecipients.split(",").map((e) => e.trim()).filter(Boolean)
      : undefined

    const newContactEmails = data.contactEmails
      ? data.contactEmails.split(",").map((e) => e.trim()).filter(Boolean)
      : undefined

    await db.subcontractOrder.update({
      where: { id: data.orderId },
      data: {
        description: data.description,
        signatory: data.signatory,
        ...(recipients ? { noticeRecipients: recipients } : {}),
        ...(data.contractSum ? { contractSum: data.contractSum } : {}),
        ...(data.retentionPct !== undefined ? { retentionPct: data.retentionPct / 100 } : {}),
      },
    })

    if (newContactEmails) {
      await db.subcontractor.update({
        where: { id: order.subcontractorId },
        data: { contactEmails: newContactEmails },
      })
    }

    await db.auditEvent.create({
      data: {
        organisationId: org.id,
        subcontractOrderId: data.orderId,
        userId,
        eventType: "contract.settings.updated",
        payload: { signatory: data.signatory, noticeRecipients: recipients },
      },
    })

    revalidatePath(`/subcontracts/${data.orderId}`)
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}

export async function archiveSubcontract(orderId: string) {
  try {
    const { org, userId } = await requireOrgAction({ minRole: "COMMERCIAL" })

    const order = await db.subcontractOrder.findFirst({
      where: { id: orderId, organisationId: org.id },
    })
    if (!order) throw new Error("Order not found")

    await db.subcontractOrder.update({
      where: { id: orderId },
      data: { isActive: false },
    })

    await db.auditEvent.create({
      data: {
        organisationId: org.id,
        subcontractOrderId: orderId,
        userId,
        eventType: "subcontract.archived",
        payload: {},
      },
    })

    revalidatePath(`/subcontracts`)
    revalidatePath(`/subcontracts/${orderId}`)
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}
