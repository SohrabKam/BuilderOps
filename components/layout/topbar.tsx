import { UserButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"

export async function Topbar() {
  const { orgId, userId } = await auth()
  const tenantId = orgId ?? userId ?? ""
  const org = tenantId
    ? await db.organisation.findUnique({ where: { clerkOrgId: tenantId }, select: { name: true } })
    : null

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0">
      <div className="text-sm text-slate-500">
        {org?.name && (
          <span className="font-medium text-slate-800">{org.name}</span>
        )}
      </div>
      <UserButton />
    </header>
  )
}
