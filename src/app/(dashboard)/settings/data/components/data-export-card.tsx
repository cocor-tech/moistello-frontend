"use client"

import { useCallback, useState } from "react"
import { Download, LoaderCircle, TriangleAlert } from "lucide-react"
import { logger } from "@/lib/logger"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

/**
 * "Download my data" control (#472).
 *
 * Two things the acceptance criteria call for live here rather than in the
 * route: the action is behind an **explicit confirmation modal**, and the
 * download is a real file rather than a navigation.
 *
 * The archive is fetched with `fetch` and turned into a Blob so it can be
 * saved under the filename the route chose. Navigating to the URL instead would
 * work, but then a rate-limited response renders JSON in the tab instead of
 * telling the user what happened.
 */
export function DataExportCard() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const runExport = useCallback(async () => {
    setIsExporting(true)
    setError(null)
    setDone(false)

    try {
      const response = await fetch("/api/export", {
        method: "GET",
        headers: { accept: "application/json" },
        credentials: "same-origin",
      })

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After")
        setError(
          `Too many export requests. Try again${
            retryAfter ? ` in ${retryAfter}s` : " shortly"
          }.`,
        )
        return
      }

      if (response.status === 401) {
        setError("Your session expired. Sign in again to export your data.")
        return
      }

      if (!response.ok) {
        setError("We could not prepare your export. Please try again.")
        return
      }

      const body = await response.json()

      // Prefer the server's filename; fall back to a dated one if the header is
      // missing (a proxy may strip it).
      const disposition = response.headers.get("Content-Disposition") ?? ""
      const match = /filename="?([^"]+)"?/.exec(disposition)
      const filename = match?.[1] ?? `moistello-data-export.json`

      const blob = new Blob([JSON.stringify(body, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      // Revoking immediately can cancel the download in some browsers.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)

      setDone(true)
    } catch (caught) {
      logger.error("[data-export] Failed:", caught)
      setError("We could not prepare your export. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }, [])

  return (
    <section
      aria-labelledby="data-export-heading"
      className="border-y border-border border-l-4 border-l-aurora-violet py-6 pl-6"
    >
      <h2 id="data-export-heading" className="font-heading text-lg font-semibold text-foreground">
        Download my data
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
        Get a JSON archive of your profile, contributions and notifications. The file contains only
        your own records.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="primary"
          onClick={() => setIsConfirmOpen(true)}
          isLoading={isExporting}
          leftIcon={isExporting ? undefined : <Download className="h-4 w-4" />}
        >
          {isExporting ? "Preparing…" : "Download my data"}
        </Button>

        {isExporting && <LoaderCircle aria-hidden className="h-4 w-4 animate-spin text-aurora-violet" />}
      </div>

      <div aria-live="polite">
        {done && !error && (
          <p className="mt-3 text-sm text-emerald-400">Your download has started.</p>
        )}
        {error && (
          <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-red-400">
            <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={runExport}
        title="Download my data"
        message="This creates a JSON file with your profile, contributions and notifications. Store it somewhere safe — it contains everything we hold about you."
        confirmLabel="Download my data"
        isLoading={isExporting}
      />
    </section>
  )
}

export default DataExportCard
