"use server"
import { requireOrgAction } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { toSafeErrorMessage } from "@/lib/prisma-error"

const CreateVariationSchema = z.object({
  orderId: z.string().min(1),
  reference: z.string().min(1, "Reference required"),
  description: z.string().min(1, "Description required"),
  instructedBy: z.string().optional(),
  instructionDate: z.string().optional(),
  status: z.enum(["PROPOSED", "INSTRUCTED", "AGREED"]).default("PROPOSED"),
  estimatedValue: z.coerce.number().optional(),
  agreedValue: z.coerce.number().optional(),
  notes: z.string().optional(),
  attachmentUrls: z.array(z.string()).optional(),
})

export async function createVariation(formData: FormData) {
  try {
    const { org, userId } = await requireOrgAction({ minRole: "COMMERCIAL" })

    const attachmentUrlsRaw = formData.get("attachmentUrlsJson") as string | null
    const raw = {
      orderId: formData.get("orderId") as string,
      reference: formData.get("reference") as string,
      description: formData.get("description") as string,
      instructedBy: (formData.get("instructedBy") as string) || undefined,
      instructionDate: (formData.get("instructionDate") as string) || undefined,
      status: formData.get("status") as string,
      estimatedValue: formData.get("estimatedValue") ? Number(formData.get("estimatedValue")) : undefined,
      agreedValue: formData.get("agreedValue") ? Number(formData.get("agreedValue")) : undefined,
      notes: (formData.get("notes") as string) || undefined,
      attachmentUrls: attachmentUrlsRaw ? (JSON.parse(attachmentUrlsRaw) as string[]) : undefined,
    }

    const data = CreateVariationSchema.parse(raw)

    const order = await db.subcontractOrder.findFirst({
      where: { id: data.orderId, organisationId: org.id },
    })
    if (!order) throw new Error("Order not found")

    await db.variation.create({
      data: {
        subcontractOrderId: data.orderId,
        reference: data.reference,
        description: data.description,
        instructedBy: data.instructedBy,
        instructionDate: data.instructionDate ? new Date(data.instructionDate) : undefined,
        status: data.status as "PROPOSED" | "INSTRUCTED" | "AGREED",
        estimatedValue: data.estimatedValue,
        agreedValue: data.agreedValue,
        notes: data.notes,
        attachmentUrls: data.attachmentUrls ?? [],
      },
    })

    await db.auditEvent.create({
      data: {
        organisationId: org.id,
        subcontractOrderId: data.orderId,
        userId,
        eventType: "variation.created",
        payload: { reference: data.reference, description: data.description, status: data.status },
      },
    })

    revalidatePath(`/subcontracts/${data.orderId}`)
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}

const UpdateVariationSchema = z.object({
  variationId: z.string().min(1),
  orderId: z.string().min(1),
  status: z.enum(["PROPOSED", "INSTRUCTED", "AGREED"]),
  estimatedValue: z.coerce.number().optional(),
  agreedValue: z.coerce.number().optional(),
  notes: z.string().optional(),
  attachmentUrls: z.array(z.string()).optional(),
})

export async function updateVariation(formData: FormData) {
  try {
    const { org, userId } = await requireOrgAction({ minRole: "COMMERCIAL" })

    const attachmentUrlsRaw = formData.get("attachmentUrlsJson") as string | null
    const raw = {
      variationId: formData.get("variationId") as string,
      orderId: formData.get("orderId") as string,
      status: formData.get("status") as string,
      estimatedValue: formData.get("estimatedValue") ? Number(formData.get("estimatedValue")) : undefined,
      agreedValue: formData.get("agreedValue") ? Number(formData.get("agreedValue")) : undefined,
      notes: (formData.get("notes") as string) || undefined,
      attachmentUrls: attachmentUrlsRaw ? (JSON.parse(attachmentUrlsRaw) as string[]) : undefined,
    }

    const data = UpdateVariationSchema.parse(raw)

    const variation = await db.variation.findFirst({
      where: { id: data.variationId, subcontractOrderId: data.orderId },
      include: { subcontractOrder: { select: { organisationId: true } } },
    })
    if (!variation || variation.subcontractOrder.organisationId !== org.id) throw new Error("Not found")

    await db.variation.update({
      where: { id: data.variationId },
      data: {
        status: data.status as "PROPOSED" | "INSTRUCTED" | "AGREED",
        estimatedValue: data.estimatedValue,
        agreedValue: data.agreedValue,
        notes: data.notes,
        ...(data.attachmentUrls !== undefined && { attachmentUrls: data.attachmentUrls }),
      },
    })

    await db.auditEvent.create({
      data: {
        organisationId: org.id,
        subcontractOrderId: data.orderId,
        userId,
        eventType: "variation.updated",
        payload: { variationId: data.variationId, status: data.status },
      },
    })

    revalidatePath(`/subcontracts/${data.orderId}`)
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}
