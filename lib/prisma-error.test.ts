import { describe, it, expect } from "vitest"
import { Prisma } from "@/lib/generated/prisma/client"
import { toSafeErrorMessage } from "./prisma-error"

describe("toSafeErrorMessage", () => {
  it("translates a unique-constraint violation without leaking column internals verbatim", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (`inboundEmail`)", {
      code: "P2002",
      clientVersion: "test",
      meta: { target: ["inboundEmail"] },
    })
    expect(toSafeErrorMessage(error)).toBe("A record with the same inboundEmail already exists.")
  })

  it("translates a not-found (P2025) error", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Record to update not found.", {
      code: "P2025",
      clientVersion: "test",
    })
    expect(toSafeErrorMessage(error)).toMatch(/no longer exists/)
  })

  it("falls back to a generic message for unrecognized Prisma error codes", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Some internal detail with a table name", {
      code: "P2099",
      clientVersion: "test",
    })
    expect(toSafeErrorMessage(error)).toBe("Something went wrong. Please try again.")
  })

  it("passes through a plain Error's message unchanged (our own hand-written throws)", () => {
    expect(toSafeErrorMessage(new Error("Unauthorized"))).toBe("Unauthorized")
  })

  it("falls back to a generic message for a non-Error thrown value", () => {
    expect(toSafeErrorMessage("some string")).toBe("Something went wrong. Please try again.")
  })
})
