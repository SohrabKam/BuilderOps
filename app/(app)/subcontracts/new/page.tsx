import { requireOrg } from "@/lib/auth"
import { db } from "@/lib/db"
import { ContractSetupWizard } from "@/components/wizard/contract-setup-wizard"

export default async function NewSubcontractPage() {
  const { org } = await requireOrg()

  const [projects, subcontractors] = await Promise.all([
    db.project.findMany({
      where: { organisationId: org.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.subcontractor.findMany({
      where: { organisationId: org.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Subcontract</h1>
        <p className="text-slate-500 text-sm mt-1">
          Set up payment terms and the system will generate all compliance deadlines automatically.
        </p>
      </div>
      <ContractSetupWizard projects={projects} subcontractors={subcontractors} />
    </div>
  )
}
