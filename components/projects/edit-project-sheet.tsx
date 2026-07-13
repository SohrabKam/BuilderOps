"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateProject } from "@/lib/actions/projects"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Pencil } from "lucide-react"

type Project = {
  id: string
  name: string
  reference: string | null
  address: string | null
}

export function EditProjectSheet({ project }: { project: Project }) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      await updateProject(fd)
      toast.success("Project updated")
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-slate-300 hover:text-indigo-500 transition-colors"
        title="Edit project"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit project</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input type="hidden" name="projectId" value={project.id} />

            <div>
              <Label>Project name</Label>
              <Input
                name="name"
                required
                className="mt-1"
                defaultValue={project.name}
                placeholder="Site A — Main Building"
              />
            </div>

            <div>
              <Label>Reference (optional)</Label>
              <Input
                name="reference"
                className="mt-1"
                defaultValue={project.reference ?? ""}
                placeholder="PROJ-001"
              />
            </div>

            <div>
              <Label>Address (optional)</Label>
              <Input
                name="address"
                className="mt-1"
                defaultValue={project.address ?? ""}
                placeholder="123 Main Street, London"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? "Saving…" : "Save changes"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
