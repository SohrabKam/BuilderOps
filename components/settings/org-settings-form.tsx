"use client"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateOrgSettings } from "@/lib/actions/settings"

export function OrgSettingsForm({
  name,
  fromName,
  fromEmail,
}: {
  name: string
  fromName: string | null
  fromEmail: string | null
}) {
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData(e.currentTarget)
      await updateOrgSettings(fd)
      toast.success("Settings saved")
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between py-1.5 border-b">
          <span className="text-slate-500">Name</span>
          <span className="font-medium">{name}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b">
          <span className="text-slate-500">From email</span>
          <span className="font-medium">{fromEmail ?? "Not configured"}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b">
          <span className="text-slate-500">From name</span>
          <span className="font-medium">{fromName ?? "Not configured"}</span>
        </div>
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Company / organisation name</Label>
        <Input name="name" required className="mt-1" defaultValue={name} />
        <p className="text-xs text-slate-400 mt-1">Appears on payment notices and emails.</p>
      </div>
      <div>
        <Label>Notice sender name</Label>
        <Input name="fromName" className="mt-1" defaultValue={fromName ?? ""} placeholder={name} />
        <p className="text-xs text-slate-400 mt-1">Display name on outgoing notice emails. Defaults to company name.</p>
      </div>
      <div>
        <Label>Notice sender email</Label>
        <Input
          name="fromEmail"
          type="email"
          className="mt-1"
          defaultValue={fromEmail ?? ""}
          placeholder="notices@yourcompany.co.uk"
        />
        <p className="text-xs text-slate-400 mt-1">Must be a domain verified in Resend.</p>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={saving} size="sm">
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
