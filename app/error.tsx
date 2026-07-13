"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-sm font-medium text-destructive">Something went wrong</p>
      <h1 className="text-xl font-semibold text-foreground">This page hit an unexpected error</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The issue has been logged. You can try again, or head back to the dashboard.
        {error.digest ? ` (Reference: ${error.digest})` : null}
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  )
}
