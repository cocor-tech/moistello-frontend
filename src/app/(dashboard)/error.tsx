"use client"

import { useEffect } from "react"
import Link from "next/link"
import { LoaderCircle, TriangleAlert } from "lucide-react"
import { Button, ButtonLink } from "@/components/ui/button"
import { logger } from "@/lib/logger"

/**
 * Route-level error boundary for the authenticated segment.
 *
 * There was no `error.tsx` at any level, so an exception thrown while rendering
 * a nested dashboard page bubbled to `global-error.tsx`, which replaces the
 * whole document with an unstyled `<pre>` — the shell, the sidebar and the
 * user's session context all disappear at once. This keeps the blast radius to
 * the route that actually failed.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error("[dashboard] Route error:", error)
  }, [error])

  return (
    <div className="container-premium py-10">
      <section
        role="alert"
        className="border-l-4 border-l-red-400 border-y border-border py-10 md:py-14 pl-6"
      >
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-red-400">
          Interruption
        </p>

        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <h1 className="font-heading text-4xl font-black leading-tight text-foreground sm:text-6xl">
            This section failed to load.
          </h1>
          <div className="max-w-md lg:pb-2">
            <p className="mt-3 leading-relaxed text-muted-foreground">
              The rest of your dashboard is still working. Retry this section, or head back to a
              known destination.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-dashed border-border pt-6">
          <Button type="button" variant="primary" onClick={reset} leftIcon={<LoaderCircle className="h-4 w-4" />}>
            Try again
          </Button>
          <ButtonLink href="/" leftIcon={<TriangleAlert className="h-4 w-4" />}>
            Back to dashboard
          </ButtonLink>
          <Link href="/support" className="text-sm text-muted-foreground hover:text-foreground">
            Contact support
          </Link>
        </div>
      </section>
    </div>
  )
}
