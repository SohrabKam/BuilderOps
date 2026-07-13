import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { requireOrgRoute } from "@/lib/auth"

// Compliance documents, variation attachments, and application attachments
// go through this endpoint — restrict to document-like file types.
const ALLOWED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "doc", "docx", "xls", "xlsx"])
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

export async function POST(req: NextRequest) {
  const authResult = await requireOrgRoute()
  if (!authResult.ok) return authResult.response
  const { org } = authResult

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 })
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!ALLOWED_EXTENSIONS.has(ext) || (file.type && !ALLOWED_MIME_TYPES.has(file.type))) {
    return NextResponse.json(
      { error: "Unsupported file type. Allowed: PDF, PNG, JPG, DOC(X), XLS(X)." },
      { status: 400 }
    )
  }

  // Scoped by organisation (not just the uploading user) so files are
  // grouped per-tenant, matching how every other resource in the app is scoped.
  const filename = `compliance/${org.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const blob = await put(filename, file, { access: "public" })
  return NextResponse.json({ url: blob.url })
}
