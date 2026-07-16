import { randomBytes, createHash } from "crypto"

const KEY_PREFIX = "ng_live_"

// Generates a new API key. The plaintext is only ever returned here, at
// creation time — only its SHA-256 hash is persisted, so it can never be
// re-displayed later (standard API-key UX: show once, then it's gone).
// A high-entropy random token doesn't need a slow password hash (bcrypt/
// argon2) — brute-forcing 32 random bytes is infeasible regardless of hash
// speed, so plain SHA-256 is appropriate and fast to verify on every request.
export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const secret = randomBytes(32).toString("base64url")
  const plaintext = `${KEY_PREFIX}${secret}`
  return {
    plaintext,
    hash: hashApiKey(plaintext),
    prefix: plaintext.slice(0, 12),
  }
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex")
}

export function looksLikeApiKey(value: string): boolean {
  return value.startsWith(KEY_PREFIX)
}
