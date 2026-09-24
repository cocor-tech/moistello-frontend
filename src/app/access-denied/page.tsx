"use client"

import Link from "next/link"
import { ArrowRight, Home, LockKeyhole, ShieldQuestion } from "lucide-react"
import { useTranslate } from "@/lib/locale/context"

export default function Forbidden() {
  const { t } = useTranslate()

  return (
    <main className="min-h-screen bg-background">
      <div className="h-2 w-full bg-gradient-to-r from-red-500 via-amber-400 to-red-500" aria-hidden="true" />
      <section className="container-premium grid min-h-[calc(100vh-0.5rem)] items-center gap-10 py-16 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="relative border-r border-border pr-8 rtl:border-r-0 rtl:border-l rtl:pr-0 rtl:pl-8">
          <div className="absolute -right-3 top-0 h-6 w-6 border-r-2 border-t-2 border-red-400 rtl:-left-3 rtl:right-auto rtl:border-r-0 rtl:border-l-2" aria-hidden="true" />
          <div className="absolute -bottom-1 -right-3 h-6 w-6 border-b-2 border-r-2 border-red-400 rtl:-left-3 rtl:right-auto rtl:border-r-0 rtl:border-l-2" aria-hidden="true" />
          <LockKeyhole className="h-16 w-16 text-red-400" />
          <p className="mt-8 font-mono text-8xl font-black leading-none text-foreground md:text-9xl">403</p>
        </div>
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-red-400">
            {t("error.403.protected", "Protected resource")}
          </span>
          <h1 className="mt-5 font-heading text-4xl font-bold text-foreground md:text-6xl">{t("error.403.title", "Access denied.")}</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {t("error.403.desc", "Your account does not have permission to open this resource. If that seems wrong, support can help verify your access.")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/support" className="inline-flex items-center gap-2 bg-red-500 px-5 py-3 font-heading font-semibold text-white hover:bg-red-400">
              <ShieldQuestion className="h-4 w-4" />
              {t("error.403.contactSupport", "Contact support")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 border border-border px-5 py-3 font-heading text-foreground hover:border-red-400/50">
              <Home className="h-4 w-4" />
              {t("nav.home", "Home")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

