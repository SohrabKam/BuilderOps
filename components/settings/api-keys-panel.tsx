"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createApiKey, revokeApiKey } from "@/lib/actions/api-keys"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Check } from "lucide-react"

type ApiKeyRow = {
  id: string
  name: string
  keyPrefix: string
  scope: string
  createdAt: Date
  lastUsedAt: Date | null
  revokedAt: Date | null
}

export function ApiKeysPanel({ apiKeys }: { apiKeys: ApiKeyRow[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [scope, setScope] = useState<"READ" | "WRITE">("READ")
  const [creating, setCreating] = useState(false)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Give the key a name so you can recognise it later")
      return
    }
    setCreating(true)
    try {
      const { plaintext } = await createApiKey(name.trim(), scope)
      setRevealedKey(plaintext)
      setName("")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key")
    } finally {
      setCreating(false)
    }
  }

  async function handleCopy() {
    if (!revealedKey) return
    await navigator.clipboard.writeText(revealedKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRevoke(id: string) {
    setRevokingId(id)
    try {
      await revokeApiKey(id)
      toast.success("Key revoked")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke key")
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {revealedKey && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-medium text-amber-800">
            Copy this key now — you won&apos;t be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-amber-200 rounded px-2 py-1.5 overflow-x-auto whitespace-nowrap">
              {revealedKey}
            </code>
            <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setRevealedKey(null)}
            className="text-xs text-amber-700 hover:underline"
          >
            I&apos;ve saved it, hide this
          </button>
        </div>
      )}

      {apiKeys.length > 0 ? (
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              <th className="text-left py-2 font-medium text-slate-600">Name</th>
              <th className="text-left py-2 font-medium text-slate-600">Key</th>
              <th className="text-left py-2 font-medium text-slate-600">Scope</th>
              <th className="text-left py-2 font-medium text-slate-600">Last used</th>
              <th className="text-left py-2 font-medium text-slate-600" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {apiKeys.map((key) => (
              <tr key={key.id} className={key.revokedAt ? "opacity-50" : ""}>
                <td className="py-2.5">{key.name}</td>
                <td className="py-2.5 font-mono text-xs text-slate-500">{key.keyPrefix}…</td>
                <td className="py-2.5 text-xs capitalize">{key.scope.toLowerCase()}</td>
                <td className="py-2.5 text-xs text-slate-500">
                  {key.revokedAt
                    ? "Revoked"
                    : key.lastUsedAt
                    ? new Date(key.lastUsedAt).toLocaleDateString("en-GB")
                    : "Never"}
                </td>
                <td className="py-2.5 text-right">
                  {!key.revokedAt && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(key.id)}
                      disabled={revokingId === key.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      {revokingId === key.id ? "…" : "Revoke"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-slate-400">No API keys yet.</p>
      )}

      <div className="flex items-end gap-2 pt-2 border-t">
        <div className="flex-1 max-w-xs">
          <label className="text-xs text-slate-500 mb-1 block">Key name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Xero sync"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Scope</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as "READ" | "WRITE")}
            className="text-sm border border-slate-200 rounded px-2 py-1.5 h-8 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          >
            <option value="READ">Read-only</option>
            <option value="WRITE">Read &amp; write</option>
          </select>
        </div>
        <Button type="button" onClick={handleCreate} disabled={creating} size="sm">
          {creating ? "Creating…" : "Create key"}
        </Button>
      </div>
    </div>
  )
}
