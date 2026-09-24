"use client"

import { ContributionForm } from "../contribution-form"
import { useTranslate } from "@/lib/locale/context"

export function ContributorContent() {
  const { t } = useTranslate()

  const whyContribute = [
    {
      icon: GlobeIcon,
      title: t("contributor.globalImpactTitle", "Global Impact"),
      desc: t("contributor.globalImpactDesc", "Build financial inclusion tools for communities worldwide."),
    },
    {
      icon: CodeIcon,
      title: t("contributor.learnGrowTitle", "Learn & Grow"),
      desc: t("contributor.learnGrowDesc", "Work with cutting-edge blockchain tech and DeFi protocols."),
    },
    {
      icon: UsersIcon,
      title: t("contributor.joinCommTitle", "Join Community"),
      desc: t("contributor.joinCommDesc", "Connect with passionate builders shaping open finance."),
    },
    {
      icon: HeartIcon,
      title: t("contributor.recognitionTitle", "Recognition"),
      desc: t("contributor.recognitionDesc", "Your work acknowledged in docs, releases, and events."),
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-aurora-indigo/8 via-transparent to-aurora-violet/5 pointer-events-none" />
        <div className="container-premium pt-24 pb-16 md:pt-32 md:pb-24 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-aurora-violet/10 border border-aurora-violet/20 text-xs text-aurora-violet font-medium mb-6">
              <HeartIcon className="h-3.5 w-3.5" />
              {t("contributor.badge", "Open Source")}
            </div>
            <h1 className="font-heading text-4xl md:text-6xl font-black mb-4">
              {t("contributor.title", "Join Our Mission")}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-lg mx-auto">
              {t("contributor.subtitle", "Build the future of decentralized savings on Stellar. We welcome developers, designers, writers, and community builders.")}
            </p>
          </div>
        </div>
      </section>

      {/* DESKTOP: WHY + FORM SIDE BY SIDE */}
      <section className="container-premium pb-20">
        <div className="hidden md:grid md:grid-cols-2 gap-6">
          {/* LEFT: Why Contribute */}
          <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-white/10 p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-violet/15 text-aurora-violet">
                <HeartIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  {t("contributor.whyTitle", "Why Contribute?")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("contributor.missionHint", "Join our mission")}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {whyContribute.map((item) => (
                <div key={item.title} className="flex gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 shrink-0">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Application Form */}
          <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-white/10 p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-cyan/15 text-aurora-cyan">
                <SendIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  {t("contributor.applyNow", "Apply Now")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("contributor.reviewTime", "We'll review in 3-5 days")}
                </p>
              </div>
            </div>
            <ContributionForm />
          </div>
        </div>

        {/* MOBILE: STACKED */}
        <div className="md:hidden space-y-6">
          <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-violet/15 text-aurora-violet">
                <SendIcon className="h-5 w-5" />
              </span>
              <h2 className="font-heading text-base font-semibold text-foreground">
                {t("contributor.applyNow", "Apply Now")}
              </h2>
            </div>
            <ContributionForm />
          </div>

          <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-cyan/15 text-aurora-cyan">
                <HeartIcon className="h-5 w-5" />
              </span>
              <h2 className="font-heading text-base font-semibold text-foreground">
                {t("contributor.whyTitle", "Why Contribute?")}
              </h2>
            </div>
            <div className="space-y-3 text-sm">
              {whyContribute.slice(0, 3).map((item) => (
                <div key={item.title} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function HeartIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
}

function SendIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
}

function GlobeIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
}

function CodeIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
}

function UsersIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
