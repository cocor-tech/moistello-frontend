import type { Metadata } from "next"
import Link from "next/link"
import { Check, House, KeyRound, LogIn } from "lucide-react"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"

export const metadata: Metadata = buildRouteMetadata("/auth-required")

const steps = ["Identity requested", "Session checked", "Sign in required"]

export default function Unauthorized() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute right-[8%] top-[12%] font-mono text-[12rem] font-black text-aurora-violet/[0.04]" aria-hidden="true">
        401
      </div>
      <section className="container-premium relative flex min-h-screen items-center py-16">
        <div className="grid w-full gap-12 md:grid-cols-[minmax(0,1fr)_18rem] md:items-center">
          <div>
            <div className="flex h-14 w-14 rotate-3 items-center justify-center bg-aurora-violet text-white shadow-xl shadow-aurora-violet/20">
              <KeyRound className="h-7 w-7" />
            </div>
            <p className="mt-8 font-mono text-xs uppercase tracking-[0.3em] text-aurora-violet">Checkpoint 401</p>
            <h1 className="mt-3 max-w-2xl font-heading text-5xl font-black leading-tight text-foreground md:text-7xl">
              Your session needs a key.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Sign in to continue. If you were already signed in, your previous session may have expired.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 gradient-bg-extended px-6 py-3 font-heading font-semibold text-white">
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
              <Link href="/" className="inline-flex items-center gap-2 px-5 py-3 font-heading text-muted-foreground hover:text-foreground">
                <House className="h-4 w-4" />
                Return home
              </Link>
            </div>
          </div>
          <ol className="relative space-y-8 border-l border-aurora-violet/30 pl-8">
            {steps.map((step, index) => (
              <li key={step} className="relative">
                <span className="absolute -left-[2.55rem] flex h-5 w-5 items-center justify-center rounded-full border border-aurora-violet bg-background text-aurora-violet">
                  {index < 2 ? <Check className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full bg-aurora-violet" />}
                </span>
                <p className="font-mono text-xs text-muted-foreground">0{index + 1}</p>
                <p className="mt-1 font-heading font-semibold text-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  )
}
