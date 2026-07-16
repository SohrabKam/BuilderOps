// Shared between the compliance-doc server action and the /api/v1
// compliance-documents endpoint so both compute status identically.
export type ComplianceDocStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED" | "MISSING"

export function computeComplianceStatus(issueDate?: string | null, expiryDate?: string | null): ComplianceDocStatus {
  if (!expiryDate) return issueDate ? "VALID" : "MISSING"
  const expiry = new Date(expiryDate)
  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 86_400_000)
  if (expiry < now) return "EXPIRED"
  if (expiry <= thirtyDays) return "EXPIRING_SOON"
  return "VALID"
}
