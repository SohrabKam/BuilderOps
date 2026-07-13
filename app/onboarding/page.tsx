import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { OnboardingForm } from "./onboarding-form"

export default async function OnboardingPage() {
  const { orgId, userId } = await auth()
  if (!userId) redirect("/sign-in")

  const tenantId = orgId ?? userId
  const user = await currentUser()
  if (!user) redirect("/sign-in")

  const displayName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
  const email = user.emailAddresses[0]?.emailAddress ?? ""

  // Already onboarded — ensure member record and redirect
  const existing = await db.organisation.findUnique({ where: { clerkOrgId: tenantId } })
  if (existing) {
    await db.orgMember.upsert({
      where: { clerkUserId_organisationId: { clerkUserId: userId, organisationId: existing.id } },
      create: { clerkUserId: userId, organisationId: existing.id, role: "ADMIN", name: displayName || email, email },
      update: {},
    })
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block bg-indigo-600 text-white font-bold text-xl px-4 py-2 rounded-lg mb-4">
            NoticeGuard
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome{user.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            Set up your organisation to start tracking payment deadlines.
          </p>
        </div>

        <OnboardingForm
          userId={userId}
          tenantId={tenantId}
          displayName={displayName || email}
          email={email}
        />
      </div>
    </div>
  )
}
