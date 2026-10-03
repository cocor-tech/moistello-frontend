import Link from "next/link"
import { Compass, LayoutDashboard, Search } from "lucide-react"
import { GoBackButton } from "@/components/shared/go-back-button"

/**
 * 404 boundary for everything under the authenticated `(dashboard)` segment.
 *
 * Only the root `not-found.tsx` existed before, and that one is a full-bleed
 * `min-h-screen` page. An unknown nested path therefore threw away the app shell
 * (sidebar, header, navigation) and rendered an unrelated full-screen page —
 * which is the "partially broken layout" in the issue. A boundary inside the
 * route group renders *inside* `(dashboard)/layout.tsx`, so the shell survives.
 */
export default function DashboardNotFound() {
  return (
    <div className="container-premium py-10">
      <section className="border-y border-border py-10 md:py-14">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-aurora-violet">
          Unknown coordinate
        </p>

        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <h1 className="font-heading text-6xl font-black leading-[0.8] text-foreground sm:text-8xl">
            404
          </h1>
          <div className="max-w-md lg:pb-2">
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              Nothing lives at this address.
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              The page may have moved, expired, or never existed. You are still signed in — pick a
              destination below to carry on.
            </p>
          </div>
        </div>

        <nav
          aria-label="Recovery navigation"
          className="mt-8 flex flex-wrap gap-x-7 gap-y-4 border-t border-dashed border-border pt-6"
        >
          <Link
            href="/"
            className="group inline-flex items-center gap-2 font-heading text-foreground"
          >
            <LayoutDashboard className="h-4 w-4 text-aurora-violet" />
            <span className="border-b border-transparent group-hover:border-aurora-violet">
              Dashboard
            </span>
          </Link>
          <Link
            href="/circles"
            className="group inline-flex items-center gap-2 font-heading text-muted-foreground hover:text-foreground"
          >
            <Compass className="h-4 w-4" />
            <span className="border-b border-transparent group-hover:border-foreground">
              Browse circles
            </span>
          </Link>
          <Link
            href="/docs"
            className="group inline-flex items-center gap-2 font-heading text-muted-foreground hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="border-b border-transparent group-hover:border-foreground">
              Browse docs
            </span>
          </Link>
          <GoBackButton />
        </nav>
      </section>
    </div>
  )
}
