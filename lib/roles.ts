import type { Role } from "./generated/prisma/client"

// Ordinal ranking for the Role enum — higher can do everything a lower role
// can. Kept as a small pure function so it's testable without mocking Clerk.
const ROLE_RANK: Record<Role, number> = {
  VIEWER: 0,
  COMMERCIAL: 1,
  ADMIN: 2,
}

export function roleMeets(role: Role, minRole: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole]
}
