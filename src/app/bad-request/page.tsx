"use client"

import Link from "next/link"
import { AlertTriangle, ArrowLeft, Braces, Home } from "lucide-react"
import { useTranslate } from "@/lib/locale/context"

export default function BadRequest() {
  const { t } = useTranslate()

  const tags = [
    t("error.400.tag1", "invalid input"),
    t("error.400.tag2", "request rejected"),
    t("error.400.tag3", "safe to retry")
  ]

  return (
    <main className="min-h-screen bg-background px-5 py-10 md:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col border border-amber-400/30">
        <header className="flex items-center justify-between border-b border-amber-400/20 px-5 py-4 font-mono text-xs uppercase tracking-wider text-amber-400">
          <span className="inline-flex items-center gap-2"><Braces className="h-4 w-4" /> {t("error.400.inspector", "Request inspector")}</span>
          <span>HTTP / 400</span>
        </header>
        <div className="grid flex-1 items-center gap-10 p-6 md:grid-cols-2 md:p-12">
          <div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-amber-400/20 px-3 py-1 font-mono text-xs text-amber-400">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="mt-7 font-heading text-4xl font-bold text-foreground md:text-6xl">{t("error.400.title", "The request did not parse.")}</h1>
            <p className="mt-5 max-w-lg leading-relaxed text-muted-foreground">
              {t("error.400.desc", "One or more request values were invalid. Return to the previous screen, check the input, and submit again.")}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button type="button" onClick={() => history.back()} className="inline-flex items-center gap-2 bg-amber-400 px-5 py-3 font-heading font-semibold text-black">
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {t("error.400.reviewInput", "Review input")}
              </button>
              <Link href="/" className="inline-flex items-center gap-2 border-b border-amber-400/40 px-2 py-3 font-heading text-foreground">
                <Home className="h-4 w-4" />
                {t("nav.home", "Home")}
              </Link>
            </div>
          </div>
          <div className="relative border-l border-dashed border-amber-400/30 py-12 pl-8 text-right md:pl-12 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-8 md:rtl:pr-12 rtl:text-left">
            <AlertTriangle className="absolute left-[-1.25rem] rtl:left-auto rtl:right-[-1.25rem] top-1/2 h-10 w-10 -translate-y-1/2 bg-background p-2 text-amber-400" />
            <p className="-rotate-3 rtl:rotate-3 font-mono text-[8rem] font-black leading-none text-amber-400 md:text-[12rem]">400</p>
          </div>
        </div>
      </section>
    </main>
  )
}

