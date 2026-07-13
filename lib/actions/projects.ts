"use server"
import { requireOrgAction } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { toSafeErrorMessage } from "@/lib/prisma-error"

const schema = z.object({
  name: z.string().min(1),
  reference: z.string().optional(),
  address: z.string().optional(),
})

export async function createProject(formData: FormData) {
  try {
    const { org } = await requireOrgAction()

    const data = schema.parse({
      name: formData.get("name"),
      reference: formData.get("reference") || undefined,
      address: formData.get("address") || undefined,
    })

    await db.project.create({
      data: { organisationId: org.id, ...data },
    })

    revalidatePath("/projects")
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
  redirect(`/projects`)
}

export async function updateProject(formData: FormData) {
  try {
    const { org } = await requireOrgAction()

    const projectId = formData.get("projectId") as string
    const data = schema.parse({
      name: formData.get("name"),
      reference: formData.get("reference") || undefined,
      address: formData.get("address") || undefined,
    })

    await db.project.updateMany({
      where: { id: projectId, organisationId: org.id },
      data,
    })

    revalidatePath("/projects")
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}
