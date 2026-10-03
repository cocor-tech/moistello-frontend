"use client"

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/cn"

const DEFAULT_HINT = "Scroll sideways to see the remaining columns."

export interface TableScrollRegionProps {
  /**
   * Accessible name for the scroll region. Required: a `role="region"` without a
   * name is an unnamed landmark, which is why a keyboard user tabbing into a
   * wide table previously heard nothing about what they had landed on.
   */
  label: string
  /** Visually hidden description, announced via `aria-describedby`. */
  hint?: string
  children: ReactNode
  /** Rendered inside the border, after the hint bar — e.g. pagination. */
  footer?: ReactNode
  className?: string
  contentClassName?: string
  /** Set false to suppress the prev/next affordance. */
  showControls?: boolean
}

/**
 * A horizontally scrollable container a keyboard user can actually operate.
 *
 * 1. `tabIndex={0}` makes the region reachable; `role="region"` + `aria-label`
 *    give it a name, and `aria-describedby` explains that it scrolls. Focus
 *    passes through it in one Tab stop and the arrow keys scroll it, so it
 *    never traps.
 * 2. When the content genuinely overflows, a visible hint plus prev/next
 *    controls appear, so scrollability is discoverable without a mouse.
 *
 * Below the `sm` breakpoint tables reflow into stacked cards instead
 * (`.responsive-table` in `globals.css`) and nothing overflows — but the name,
 * the description and the focus stop apply unconditionally, which is what makes
 * the treatment safe on any table regardless of how it is styled.
 */
export function TableScrollRegion({
  label,
  hint = DEFAULT_HINT,
  children,
  footer,
  className,
  contentClassName,
  showControls = true,
}: TableScrollRegionProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [edges, setEdges] = useState({ start: false, end: false })
  // React's useId emits `:r0:` — valid in HTML5 but hostile to querySelector.
  const reactId = useId().replace(/:/g, "")
  const hintId = `${reactId}-scroll-hint`

  const measure = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setEdges({
      start: el.scrollLeft > 1,
      end: maxScroll > 1 && el.scrollLeft < maxScroll - 1,
    })
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    measure()
    el.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure)

    let observer: ResizeObserver | undefined
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measure)
      observer.observe(el)
      if (el.firstElementChild) observer.observe(el.firstElementChild)
    }

    return () => {
      el.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
      observer?.disconnect()
    }
  }, [measure])

  const nudge = (direction: 1 | -1) => {
    const el = viewportRef.current
    if (!el) return
    // Keep focus on the region so an arrow-key reader does not lose their place.
    el.focus({ preventScroll: true })
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 120), behavior: "smooth" })
  }

  /**
   * The prev/next affordance only appears when the content genuinely overflows,
   * and only when the caller has not opted out. Everything gated on this — the
   * visible hint bar as well as the buttons — has to hide together, otherwise a
   * caller who suppressed the controls would be left with a visible "scroll
   * sideways" line and nothing to scroll with.
   */
  const canScroll = showControls && (edges.start || edges.end)

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={viewportRef}
        role="region"
        aria-label={label}
        aria-describedby={hintId}
        tabIndex={0}
        className={cn("scroll-region", contentClassName)}
      >
        {children}
      </div>

      {/* `sr-only` while the content fits, so the description is always available
          to `aria-describedby` without reserving empty space on every table. */}
      <div className={cn("flex items-center justify-between gap-3 px-4 py-2", !canScroll && "sr-only")}>
        <p id={hintId} className="text-2xs text-muted-foreground">
          {hint}
        </p>

        <div className={cn("flex shrink-0 items-center gap-1", !canScroll && "hidden")}>
          <button
            type="button"
            onClick={() => nudge(-1)}
            disabled={!edges.start}
            aria-label={`Scroll ${label} to the left`}
            className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            disabled={!edges.end}
            aria-label={`Scroll ${label} to the right`}
            className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {footer}
    </div>
  )
}
