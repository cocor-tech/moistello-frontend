"use client"

import { useEffect, useRef } from "react"

/**
 * Accessible validation error summary for long forms.
 *
 * Why this exists: rendering each field error with `role="alert"` announces
 * them one at a time, out of context. A screen reader user who submits an
 * empty form hears "This field is required" several times with no indication of
 * what went wrong or how to get past it, and has no way to jump to the offending
 * field.
 *
 * This renders one assertive alert listing every invalid field, with each entry
 * linking to its field via `href="#<field-id>"` so the user can navigate
 * directly to it. It also moves focus to the summary on failed submit, so the
 * announcement is not missed.
 *
 * Each entry should point at the field's own error node via `href`, which
 * callers wire up as `aria-describedby` on the input.
 */
export interface ErrorSummaryEntry {
  /** DOM id of the invalid field. Used as the anchor target. */
  fieldId: string
  /** Human-readable field label, e.g. "GitHub profile". */
  label: string
  /** The validation message for that field. */
  message: string
}

export interface ErrorSummaryProps {
  entries: ErrorSummaryEntry[]
  /** Optional heading override. */
  title?: string
  className?: string
}

export function ErrorSummary({
  entries,
  title = "Please fix the following errors",
  className = "",
}: ErrorSummaryProps) {
  const headingRef = useRef<HTMLParagraphElement>(null)
  const wasEmpty = useRef(true)

  useEffect(() => {
    // Only steal focus on the empty -> has-errors transition. Keying this on
    // `entries` directly would re-focus on every render (the array is a new
    // reference each time), yanking the caret out of the field the user is
    // actively correcting.
    if (entries.length > 0 && wasEmpty.current) {
      headingRef.current?.focus()
    }
    wasEmpty.current = entries.length === 0
  }, [entries])

  if (entries.length === 0) return null

  return (
    <div
      role="alert"
      aria-labelledby="error-summary-heading"
      data-testid="error-summary"
      className={`rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 ${className}`}
    >
      <p
        id="error-summary-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-sm font-medium text-red-400 outline-none"
      >
        {title}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-400">
        {entries.map((entry) => (
          <li key={entry.fieldId}>
            <a
              href={`#${entry.fieldId}`}
              className="underline underline-offset-2 hover:text-red-300"
              onClick={(e) => {
                e.preventDefault()
                const field = document.getElementById(entry.fieldId)
                if (!field) return
                field.focus()
                // Not implemented in jsdom, and absent on some older engines, so
                // a missing method must not abort the handler after focus() and
                // surface as an unhandled error.
                field.scrollIntoView?.({ block: "center" })
              }}
            >
              <span className="font-medium">{entry.label}:</span> {entry.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
