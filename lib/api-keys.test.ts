import { describe, it, expect } from "vitest"
import { generateApiKey, hashApiKey, looksLikeApiKey } from "./api-keys"

describe("generateApiKey", () => {
  it("produces a plaintext key whose hash matches independently re-hashing it", () => {
    const { plaintext, hash } = generateApiKey()
    expect(hashApiKey(plaintext)).toBe(hash)
  })

  it("produces a prefix that is the start of the plaintext", () => {
    const { plaintext, prefix } = generateApiKey()
    expect(plaintext.startsWith(prefix)).toBe(true)
  })

  it("generates unique keys on each call", () => {
    const a = generateApiKey()
    const b = generateApiKey()
    expect(a.plaintext).not.toBe(b.plaintext)
    expect(a.hash).not.toBe(b.hash)
  })

  it("is recognised by looksLikeApiKey, unrelated strings are not", () => {
    const { plaintext } = generateApiKey()
    expect(looksLikeApiKey(plaintext)).toBe(true)
    expect(looksLikeApiKey("sk_live_something")).toBe(false)
    expect(looksLikeApiKey("")).toBe(false)
  })
})

describe("hashApiKey", () => {
  it("is deterministic", () => {
    expect(hashApiKey("ng_live_abc")).toBe(hashApiKey("ng_live_abc"))
  })

  it("produces different hashes for different input", () => {
    expect(hashApiKey("ng_live_abc")).not.toBe(hashApiKey("ng_live_abd"))
  })
})
