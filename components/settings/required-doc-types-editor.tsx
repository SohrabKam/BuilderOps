"use client"
import { useState } from "react"
import { toast } from "sonner"
import { updateRequiredDocTypes } from "@/lib/actions/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Plus } from "lucide-react"

export function RequiredDocTypesEditor({ initial }: { initial: string[] }) {
  const [types, setTypes] = useState<string[]>(initial)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)

  function add() {
    const trimmed = draft.trim()
    if (!trimmed || types.includes(trimmed)) return
    setTypes((prev) => [...prev, trimmed])
    setDraft("")
  }

  function remove(t: string) {
    setTypes((prev) => prev.filter((x) => x !== t))
  }

  async function save() {
    setSaving(true)
    try {
      await updateRequiredDocTypes(types)
      toast.success("Required document types saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <span key={t} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-sm text-slate-700">
            {t}
            <button type="button" onClick={() => remove(t)} className="text-slate-400 hover:text-red-500">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {types.length === 0 && (
          <span className="text-sm text-slate-400">No required document types configured.</span>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
          placeholder="e.g. Public Liability Insurance"
          className="max-w-xs"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={!draft.trim()}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>

      <Button onClick={save} disabled={saving} size="sm">
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  )
}
