"use client"
import { useState } from "react"
import { toast } from "sonner"
import { updateMemberEscalation } from "@/lib/actions/settings"

export function MemberEscalationInput({
  memberId,
  escalationTo,
}: {
  memberId: string
  escalationTo: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(escalationTo ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await updateMemberEscalation(memberId, value || null)
      toast.success("Saved")
      setEditing(false)
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-slate-500 text-xs truncate max-w-[160px]">
          {escalationTo ?? <em className="text-slate-300">not set</em>}
        </span>
        <button onClick={() => setEditing(true)} className="text-xs text-indigo-500 hover:underline">
          {escalationTo ? "Edit" : "Set"}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="escalation@example.com"
        className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300 w-40"
        autoFocus
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="text-xs text-emerald-600 font-medium hover:text-emerald-800"
      >
        {saving ? "…" : "Save"}
      </button>
      <button onClick={() => { setEditing(false); setValue(escalationTo ?? "") }} className="text-xs text-slate-400 hover:text-slate-600">
        ✕
      </button>
    </div>
  )
}
