import { Prisma } from "@/lib/generated/prisma/client"

// Translates a caught error from a server action into a message safe to show
// to an end user. Known Prisma errors (constraint violations, missing
// records) get a clean, specific message instead of leaking table/column
// names; anything unrecognized gets logged server-side and a generic
// fallback instead of the raw internal message. Errors we threw ourselves
// (e.g. `throw new Error("Unauthorized")`) are plain `Error` instances with
// messages we already wrote to be user-safe, so they pass through unchanged.
export function toSafeErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        const target = error.meta?.target
        const field = Array.isArray(target) ? target.join(", ") : "this value"
        return `A record with the same ${field} already exists.`
      }
      case "P2025":
        return "That record no longer exists — it may have been deleted or changed by someone else."
      case "P2003":
        return "This action refers to a record that no longer exists."
      default:
        console.error("Unhandled Prisma error:", error.code, error.message)
        return fallback
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error("Prisma validation error:", error.message)
    return "Some of the submitted data was invalid."
  }

  if (error instanceof Error) {
    // A message we wrote ourselves — safe to surface as-is.
    return error.message
  }

  console.error("Unknown error:", error)
  return fallback
}
