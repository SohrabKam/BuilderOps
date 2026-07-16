"use client"
import { OrganizationProfile } from "@clerk/nextjs"

// Clerk's hosted org-management UI: invite members, view/cancel pending
// invitations, change roles, remove members. Role changes made here sync
// into our own OrgMember table via the organizationMembership.* webhook
// (app/api/webhooks/clerk/route.ts) — that webhook must have a real
// CLERK_WEBHOOK_SECRET configured for the sync to actually happen.
export default function TeamPage() {
  return (
    <div className="flex justify-center">
      <OrganizationProfile
        routing="path"
        path="/team"
        appearance={{
          elements: {
            rootBox: "w-full max-w-3xl",
            cardBox: "w-full shadow-sm",
          },
        }}
      />
    </div>
  )
}
