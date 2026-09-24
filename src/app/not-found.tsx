import Link from "next/link"
import { ArrowLeft, Home, Search } from "lucide-react"
import { useTranslate } from "@/lib/locale/context"

export default function NotFound() {
  const { t } = useTranslate()

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="absolute inset-0 opacity-40"
        aria-hidden="true"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(139,92,246,.28) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute -left-20 top-24 h-56 w-56 rounded-full border border-aurora-violet/20" aria-hidden="true" />
      <div className="absolute -left-10 top-36 h-32 w-32 rounded-full border border-aurora-violet/30" aria-hidden="true" />

      <section className="container-premium relative flex min-h-screen items-center py-16">
        <div className="w-full border-y border-border py-12 md:py-20 text-left rtl:text-right">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-aurora-violet">
            {t("error.404.lost")}
          </p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <h1 className="font-heading text-[7rem] font-black leading-[0.75] text-foreground sm:text-[10rem] md:text-[14rem]">
              404
            </h1>
            <div className="max-w-md lg:pb-3">
              <h2 className="font-heading text-3xl font-semibold text-foreground">
                {t("error.404.title")}
              </h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {t("error.404.desc")}
              </p>
            </div>
          </div>
          <nav className="mt-10 flex flex-wrap gap-x-7 gap-y-4 border-t border-dashed border-border pt-6">
            <Link href="/" className="group inline-flex items-center gap-2 font-heading text-foreground">
              <Home className="h-4 w-4 text-aurora-violet" />
              <span className="border-b border-transparent group-hover:border-aurora-violet">
                {t("error.404.goHome")}
              </span>
            </Link>
            <Link href="/docs" className="group inline-flex items-center gap-2 font-heading text-muted-foreground hover:text-foreground">
              <Search className="h-4 w-4" />
              <span className="border-b border-transparent group-hover:border-foreground">
                {t("error.404.browseDocs")}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => history.back()}
              className="group inline-flex items-center gap-2 font-heading text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 rtl-flip" />
              <span className="border-b border-transparent group-hover:border-foreground">
                {t("error.404.goBack")}
              </span>
            </button>
          </nav>
        </div>
      </section>
    </main>
  )
}
