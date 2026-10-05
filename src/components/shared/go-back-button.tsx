"use client"

import { ArrowLeft } from "lucide-react"

/**
 * Interactive part of the not-found pages.
 *
 * This is a separate client component because `history.back()` cannot run in a
 * server component: `not-found.tsx` files are server components by default, and
 * an `onClick` handler in one is a build-time error. Extracting the single
 * interactive control keeps the surrounding markup server-rendered.
 */
export function GoBackButton({ label = "Go back" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      className="group inline-flex items-center gap-2 font-heading text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="border-b border-transparent group-hover:border-foreground">{label}</span>
    </button>
  )
}
