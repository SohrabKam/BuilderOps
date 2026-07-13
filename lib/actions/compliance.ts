"use server"
import { requireOrgAction } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { toSafeErrorMessage } from "@/lib/prisma-error"

const UpsertDocSchema = z.object({
  subcontractorId: z.string().min(1),
  documentType: z.string().min(1, "Document type required"),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
  existingId: z.string().optional(),
  fileUrl: z.string().url().optional().or(z.literal("")),
})

function computeStatus(issueDate?: string, expiryDate?: string): string {
  if (!expiryDate) return issueDate ? "VALID" : "MISSING"
  const expiry = new Date(expiryDate)
  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 86_400_000)
  if (expiry < now) return "EXPIRED"
  if (expiry <= thirtyDays) return "EXPIRING_SOON"
  return "VALID"
}

export async function upsertComplianceDoc(formData: FormData) {
  try {
    const { org, userId } = await requireOrgAction()

    const raw = {
      subcontractorId: formData.get("subcontractorId") as string,
      documentType: formData.get("documentType") as string,
      issueDate: (formData.get("issueDate") as string) || undefined,
      expiryDate: (formData.get("expiryDate") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
      existingId: (formData.get("existingId") as string) || undefined,
      fileUrl: (formData.get("fileUrl") as string) || undefined,
    }

    const data = UpsertDocSchema.parse(raw)

    // Verify the subcontractor belongs to this org
    const sub = await db.subcontractor.findFirst({
      where: { id: data.subcontractorId, organisationId: org.id },
    })
    if (!sub) throw new Error("Subcontractor not found")

    const status = computeStatus(data.issueDate, data.expiryDate)

    const fileUrl = data.fileUrl || undefined

    if (data.existingId) {
      await db.complianceDocument.update({
        where: { id: data.existingId },
        data: {
          documentType: data.documentType,
          issueDate: data.issueDate ? new Date(data.issueDate) : null,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          notes: data.notes ?? null,
          status: status as "VALID" | "EXPIRING_SOON" | "EXPIRED" | "MISSING",
          ...(fileUrl ? { fileUrl } : {}),
        },
      })
    } else {
      await db.complianceDocument.create({
        data: {
          subcontractorId: data.subcontractorId,
          documentType: data.documentType,
          issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
          notes: data.notes,
          status: status as "VALID" | "EXPIRING_SOON" | "EXPIRED" | "MISSING",
          fileUrl,
        },
      })
    }

    await db.auditEvent.create({
      data: {
        organisationId: org.id,
        userId,
        eventType: data.existingId ? "compliance.doc.updated" : "compliance.doc.created",
        payload: { subcontractorId: data.subcontractorId, documentType: data.documentType, status },
      },
    })

    revalidatePath("/compliance")
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}
