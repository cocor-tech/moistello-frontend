"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { DataExportCard } from "./components/data-export-card"

/**
 * Data portability settings (#472).
 *
 * Kept as its own settings section rather than folded into /settings/privacy
 * because a full data export is a different weight of action from a visibility
 * toggle, and deserves a page that is only about that.
 */
export default function DataSettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          aria-label="Back to settings"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>
        <h1 className="mt-3 font-heading text-2xl font-bold text-foreground">Your data</h1>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          Take your data with you, or review what we hold.
        </p>
      </div>

      <DataExportCard />
    </div>
  )
}
