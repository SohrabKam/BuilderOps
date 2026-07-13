"use client"

import { useEffect } from "react"

// Catches errors thrown from the root layout itself, where app/error.tsx
// can't apply (it renders inside the layout). Must render its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "0 1.5rem", textAlign: "center", fontFamily: "sans-serif" }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#dc2626" }}>Something went wrong</p>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>NoticeGuard hit an unexpected error</h1>
          <p style={{ maxWidth: "24rem", fontSize: "0.875rem", color: "#64748b" }}>
            The issue has been logged. Please try again.
            {error.digest ? ` (Reference: ${error.digest})` : null}
          </p>
          <button
            onClick={() => reset()}
            style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", background: "#1e293b", color: "#fff", fontSize: "0.875rem", border: "none", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
