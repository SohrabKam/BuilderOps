import { createProject } from "@/lib/actions/projects"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function NewProjectPage() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Project</h1>
        <p className="text-slate-500 text-sm mt-1">Add a development project to start tracking subcontract payments</p>
      </div>

      <form action={createProject} className="space-y-4 bg-white rounded-lg border p-6">
        <div>
          <Label htmlFor="name">Project name <span className="text-red-500">*</span></Label>
          <Input id="name" name="name" className="mt-1" placeholder="Highfield Gardens Phase 2" required />
        </div>
        <div>
          <Label htmlFor="reference">Reference (optional)</Label>
          <Input id="reference" name="reference" className="mt-1" placeholder="PRJ-001" />
        </div>
        <div>
          <Label htmlFor="address">Site address (optional)</Label>
          <Input id="address" name="address" className="mt-1" placeholder="123 Main Street, London" />
        </div>

        <div className="pt-2">
          <Button type="submit" className="w-full">Create project</Button>
        </div>
      </form>
    </div>
  )
}
