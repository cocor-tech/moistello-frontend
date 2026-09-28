import Link from "next/link"
import { WifiOff, House, RefreshCw } from "lucide-react"

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="relative overflow-hidden bg-amber-500/[0.06] px-6 pb-20 pt-16 md:pt-24">
        <div
          className="absolute inset-0 opacity-30"
          aria-hidden="true"
          style={{
            backgroundImage: "repeating-linear-gradient(135deg, rgba(245,158,11,.12) 0, rgba(245,158,11,.12) 1px, transparent 1px, transparent 18px)",
          }}
        />
        <div className="container-premium relative">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-amber-400">
            <WifiOff className="h-5 w-5" />
            You are offline
          </div>
          <div className="mt-7 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h1 className="font-heading text-5xl font-black text-foreground md:text-7xl">No connection</h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Check your internet connection and try again. Some content may still be available from cache.
              </p>
            </div>
            <p className="font-mono text-8xl font-black leading-none text-amber-400 md:text-9xl">503</p>
          </div>
        </div>
      </section>

      <section className="container-premium -mt-8 pb-16">
        <div className="relative border border-border bg-background px-6 py-8 shadow-2xl md:px-10">
          <div className="absolute left-0 top-0 h-1 w-1/3 bg-amber-400" aria-hidden="true" />
          <div className="mb-8 flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Recovery options</span>
            <div className="h-px flex-1 bg-gradient-to-r from-amber-400/40 to-transparent" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => location.reload()} className="inline-flex items-center justify-center gap-2 bg-amber-500 px-5 py-3 font-heading font-semibold text-white">
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
            <Link href="/" className="inline-flex items-center justify-center gap-2 px-5 py-3 font-heading text-muted-foreground hover:text-foreground">
              <House className="h-4 w-4" />
              Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
