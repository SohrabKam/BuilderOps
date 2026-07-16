"use server"
import { requireOrgAction } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { toSafeErrorMessage } from "@/lib/prisma-error"
import { generateApiKey } from "@/lib/api-keys"
import { z } from "zod"

const CreateApiKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
  scope: z.enum(["READ", "WRITE"]),
})

// Returns the plaintext key exactly once — it is never retrievable again
// after this call, matching standard API-key UX (GitHub, Stripe, etc).
export async function createApiKey(name: string, scope: "READ" | "WRITE") {
  try {
    const { org } = await requireOrgAction({ minRole: "ADMIN" })
    const data = CreateApiKeySchema.parse({ name, scope })

    const { plaintext, hash, prefix } = generateApiKey()

    await db.apiKey.create({
      data: {
        organisationId: org.id,
        name: data.name,
        scope: data.scope,
        keyHash: hash,
        keyPrefix: prefix,
      },
    })

    revalidatePath("/settings")
    return { plaintext }
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}

export async function revokeApiKey(id: string) {
  try {
    const { org } = await requireOrgAction({ minRole: "ADMIN" })

    await db.apiKey.updateMany({
      where: { id, organisationId: org.id, revokedAt: null },
      data: { revokedAt: new Date() },
    })

    revalidatePath("/settings")
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}
