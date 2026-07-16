import { describe, it, expect } from "vitest"
import { roleMeets } from "./roles"

describe("roleMeets", () => {
  it("allows a role to meet its own minimum", () => {
    expect(roleMeets("VIEWER", "VIEWER")).toBe(true)
    expect(roleMeets("COMMERCIAL", "COMMERCIAL")).toBe(true)
    expect(roleMeets("ADMIN", "ADMIN")).toBe(true)
  })

  it("allows higher roles to satisfy a lower minimum", () => {
    expect(roleMeets("ADMIN", "VIEWER")).toBe(true)
    expect(roleMeets("ADMIN", "COMMERCIAL")).toBe(true)
    expect(roleMeets("COMMERCIAL", "VIEWER")).toBe(true)
  })

  it("rejects lower roles against a higher minimum", () => {
    expect(roleMeets("VIEWER", "COMMERCIAL")).toBe(false)
    expect(roleMeets("VIEWER", "ADMIN")).toBe(false)
    expect(roleMeets("COMMERCIAL", "ADMIN")).toBe(false)
  })
})
