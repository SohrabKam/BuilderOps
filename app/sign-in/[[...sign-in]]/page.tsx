"use client"
import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">NoticeGuard</h1>
          <p className="text-sm text-slate-500 mt-1">Subcontract payment compliance</p>
        </div>
        <SignIn />
      </div>
    </div>
  )
}
