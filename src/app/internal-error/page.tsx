"use client"

import Link from "next/link"
import { Activity, ExternalLink, Home, RefreshCw } from "lucide-react"
import { useTranslate } from "@/lib/locale/context"

export default function InternalError() {
  const { t } = useTranslate()

  return (
    <main className="min-h-screen bg-background">
      <section className="relative overflow-hidden bg-red-500/[0.06] px-6 pb-20 pt-16 md:pt-24">
        <div
          className="absolute inset-0 opacity-30"
          aria-hidden="true"
          style={{
            backgroundImage: "repeating-linear-gradient(135deg, rgba(239,68,68,.12) 0, rgba(239,68,68,.12) 1px, transparent 1px, transparent 18px)",
          }}
        />
        <div className="container-premium relative">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-red-400">
            <Activity className="h-5 w-5" />
            {t("error.500.interruption", "Service interruption")}
          </div>
          <div className="mt-7 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h1 className="font-heading text-5xl font-black text-foreground md:text-7xl">
                {t("error.500.title", "Something broke upstream.")}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {t("error.500.desc", "The server could not complete this request. Your data is unchanged; retry shortly or check service status.")}
              </p>
            </div>
            <p className="font-mono text-8xl font-black leading-none text-red-400 md:text-9xl">500</p>
          </div>
        </div>
      </section>

      <section className="container-premium -mt-8 pb-16">
        <div className="relative border border-border bg-background px-6 py-8 shadow-2xl md:px-10">
          <div className="absolute left-0 rtl:left-auto rtl:right-0 top-0 h-1 w-1/3 bg-red-400" aria-hidden="true" />
          <div className="mb-8 flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-red-400 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {t("error.500.recovery", "Recovery options")}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r rtl:bg-gradient-to-l from-red-400/40 to-transparent" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => location.reload()} className="inline-flex items-center justify-center gap-2 bg-red-500 px-5 py-3 font-heading font-semibold text-white">
              <RefreshCw className="h-4 w-4" />
              {t("error.500.refresh", "Refresh")}
            </button>
            <Link href="/status" className="inline-flex items-center justify-center gap-2 border border-border px-5 py-3 font-heading text-foreground hover:border-red-400/50">
              <ExternalLink className="h-4 w-4" />
              {t("error.500.status", "System status")}
            </Link>
            <Link href="/" className="inline-flex items-center justify-center gap-2 px-5 py-3 font-heading text-muted-foreground hover:text-foreground">
              <Home className="h-4 w-4" />
              {t("nav.home", "Home")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

