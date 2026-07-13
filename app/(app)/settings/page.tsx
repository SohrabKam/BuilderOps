import { requireOrg } from "@/lib/auth"
import { db } from "@/lib/db"
import { OrgSettingsForm } from "@/components/settings/org-settings-form"
import { MemberEscalationInput } from "@/components/settings/member-escalation-input"
import { RequiredDocTypesEditor } from "@/components/settings/required-doc-types-editor"

export default async function SettingsPage() {
  const { org } = await requireOrg()

  const fullOrg = await db.organisation.findUnique({
    where: { id: org.id },
    include: { members: { orderBy: { createdAt: "asc" } } },
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Organisation and account configuration</p>
      </div>

      <div className="rounded-lg border bg-white p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Organisation</h2>
        <OrgSettingsForm
          name={fullOrg?.name ?? ""}
          fromName={fullOrg?.fromName ?? null}
          fromEmail={fullOrg?.fromEmail ?? null}
        />
      </div>

      <div className="rounded-lg border bg-white p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Team members</h2>
        {fullOrg?.members && fullOrg.members.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left py-2 font-medium text-slate-600">Name</th>
                <th className="text-left py-2 font-medium text-slate-600">Email</th>
                <th className="text-left py-2 font-medium text-slate-600">Role</th>
                <th className="text-left py-2 font-medium text-slate-600">Escalation email</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fullOrg.members.map((m) => (
                <tr key={m.id}>
                  <td className="py-2.5">{m.name}</td>
                  <td className="py-2.5 text-slate-500">{m.email}</td>
                  <td className="py-2.5 capitalize text-xs">{m.role.toLowerCase()}</td>
                  <td className="py-2.5">
                    <MemberEscalationInput memberId={m.id} escalationTo={m.escalationTo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-400">No members found.</p>
        )}
        <p className="text-xs text-slate-400 mt-2">
          Escalation email receives urgent alerts (T-1 and breached deadlines) in addition to regular alerts.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Required document types</h2>
          <p className="text-xs text-slate-400 mt-0.5">Documents that every subcontractor must hold. Missing entries will be flagged on the compliance page.</p>
        </div>
        <RequiredDocTypesEditor initial={fullOrg?.requiredDocTypes ?? []} />
      </div>
    </div>
  )
}
