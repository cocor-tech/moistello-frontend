"use client"

import Link from "next/link"
import { SearchForm } from "../search-form"
import { TicketForm } from "../ticket-form"
import { TicketLookup } from "../ticket-lookup"
import { useTranslate } from "@/lib/locale/context"

export function SupportContent() {
  const { t } = useTranslate()

  const quickLinks = [
    {
      title: t("faq.title", "Frequently Asked Questions"),
      desc: t("support.faqDesc", "Instant answers to common questions about circles, wallets, and fees."),
      href: "/faq",
      color: "from-aurora-indigo/20 to-aurora-violet/10",
      iconColor: "text-aurora-indigo bg-aurora-indigo/15",
    },
    {
      title: t("common.docs", "Documentation"),
      desc: t("support.docsDesc", "Technical guides, API references, and smart contract details."),
      href: "/docs",
      color: "from-aurora-cyan/20 to-aurora-violet/10",
      iconColor: "text-aurora-cyan bg-aurora-cyan/15",
    },
    {
      title: t("howItWorks.title", "How It Works"),
      desc: t("support.howItWorksDesc", "Learn how savings circles, MoiScore, and governance work."),
      href: "/how-it-works",
      color: "from-premium-gold/15 to-aurora-amber/10",
      iconColor: "text-premium-gold bg-premium-gold/15",
    },
  ]

  const commitments = [
    {
      icon: ClockIcon,
      title: t("support.commitment24hTitle", "24h Response"),
      desc: t("support.commitment24hDesc", "We reply to every ticket within one business day."),
    },
    {
      icon: MessageSquareIcon,
      title: t("support.commitmentPeopleTitle", "Real People"),
      desc: t("support.commitmentPeopleDesc", "No chatbots. Every ticket is handled by a human."),
    },
    {
      icon: CheckIcon,
      title: t("support.commitmentLimitsTitle", "No Ticket Limits"),
      desc: t("support.commitmentLimitsDesc", "Submit as many tickets as you need. No quotas."),
    },
    {
      icon: ExternalIcon,
      title: t("support.commitmentRoadmapTitle", "Public Roadmap"),
      desc: t("support.commitmentRoadmapDesc", "Feature requests are tracked publicly in our docs."),
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
              <MessageSquareIcon />
              {t("support.replyCommitment", "We reply within 24 hours")}
            </div>
            <h1 className="font-heading text-4xl md:text-6xl font-black mb-4">
              {t("support.helpHeading", "How can we help?")}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-lg mx-auto">
              {t("support.helpDesc", "Search our knowledge base, submit a ticket, or track an existing request.")}
            </p>
            <SearchForm />
          </div>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="container-premium py-12 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6 md:p-8 transition-all hover:bg-white/[0.04] hover:border-white/10"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${link.color} opacity-50 pointer-events-none`} />
              <div className="relative z-10">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${link.iconColor} mb-4`}>
                  <LinkIcon />
                </span>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2 group-hover:text-aurora-cyan transition-colors">
                  {link.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {link.desc}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-aurora-cyan mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  {t("common.view", "View")} <ChevronRightIcon />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* DESKTOP: SPLIT TICKET SECTION */}
      <section className="container-premium pb-20">
        <div className="hidden md:grid md:grid-cols-2 gap-6">
          {/* Submit ticket */}
          <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-white/10 p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-violet/15 text-aurora-violet">
                <TicketIcon />
              </span>
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  {t("support.submitTicket", "Submit a Ticket")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("support.submitDesc", "We'll respond within 24 hours")}
                </p>
              </div>
            </div>
            <TicketForm />
          </div>

          {/* Track ticket */}
          <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-white/10 p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-cyan/15 text-aurora-cyan">
                <SearchIcon />
              </span>
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  {t("support.trackTicket", "Track Your Ticket")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("support.trackDesc", "Enter your ticket ID to check status")}
                </p>
              </div>
            </div>
            <TicketLookup />
          </div>
        </div>

        {/* MOBILE: STACKED TICKET SECTION */}
        <div className="md:hidden space-y-6">
          <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-violet/15 text-aurora-violet">
                <TicketIcon />
              </span>
              <h2 className="font-heading text-base font-semibold text-foreground">
                {t("support.submitTicket", "Submit a Ticket")}
              </h2>
            </div>
            <TicketForm />
          </div>

          <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-cyan/15 text-aurora-cyan">
                <SearchIcon />
              </span>
              <h2 className="font-heading text-base font-semibold text-foreground">
                {t("support.trackTicket", "Track Ticket")}
              </h2>
            </div>
            <TicketLookup />
          </div>

          {/* Mobile quick links */}
          <div className="space-y-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-2xl bg-card/60 backdrop-blur-xl border border-white/10 p-4"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${link.iconColor} shrink-0`}>
                  <LinkIcon />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{link.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
                </div>
                <ChevronRightIcon />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* RESPONSE COMMITMENT */}
      <section className="border-t border-white/5">
        <div className="container-premium py-10 md:py-14">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-heading text-lg md:text-xl font-semibold text-foreground mb-3">
              {t("support.commitmentTitle", "Our Support Commitment")}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-left rtl:text-right">
              {commitments.map((item) => (
                <div key={item.title} className="text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 mx-auto mb-2">
                    <item.icon />
                  </span>
                  <p className="text-xs font-medium text-foreground mb-1">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function MessageSquareIcon() {
  return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
}

function SearchIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
}

function TicketIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 5v2"/><path d="M15 9h2"/><path d="M15 13h2"/><path d="M9 5v12"/><path d="M5 5v12"/><path d="M19 15v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/></svg>
}

function LinkIcon() {
  return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 7H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3"/><path d="M17 2h5v5"/><path d="M21 2l-8 8-4-4-6 6 4 4 8-8 8 8"/></svg>
}

function ChevronRightIcon() {
  return <svg className="h-3 w-3 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
}

function ClockIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
}

function CheckIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
}

function ExternalIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L22 2"/></svg>
}
