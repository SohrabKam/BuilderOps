"use client"
import { useState } from "react"
import { toast } from "sonner"
import { updateMemberRole } from "@/lib/actions/settings"

const ROLES = ["ADMIN", "COMMERCIAL", "VIEWER"] as const

export function MemberRoleSelect({
  memberId,
  role,
}: {
  memberId: string
  role: string
}) {
  const [current, setCurrent] = useState(role)
  const [saving, setSaving] = useState(false)

  async function handleChange(next: string) {
    const previous = current
    setCurrent(next)
    setSaving(true)
    try {
      await updateMemberRole(memberId, next as "ADMIN" | "COMMERCIAL" | "VIEWER")
      toast.success("Role updated")
    } catch (err) {
      setCurrent(previous)
      toast.error(err instanceof Error ? err.message : "Failed to update role")
    } finally {
      setSaving(false)
    }
  }

  return (
    <select
      value={current}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value)}
      className="text-xs border border-slate-200 rounded px-2 py-1 capitalize focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:opacity-50"
    >
      {ROLES.map((r) => (
        <option key={r} value={r} className="capitalize">
          {r.charAt(0) + r.slice(1).toLowerCase()}
        </option>
      ))}
    </select>
  )
}
