"use client";

import Link from "next/link";
import { Dices, ListOrdered, Gavel, Vote } from "lucide-react";
import { useTranslate } from "@/lib/locale/context";

export function HowItWorksContent() {
  const { t } = useTranslate();

  const steps = [
    { num: "01", title: t("howItWorks.step1Title"), desc: t("howItWorks.step1Desc") },
    { num: "02", title: t("howItWorks.step2Title"), desc: t("howItWorks.step2Desc") },
    { num: "03", title: t("howItWorks.step3Title"), desc: t("howItWorks.step3Desc") },
    { num: "04", title: t("howItWorks.step4Title"), desc: t("howItWorks.step4Desc") },
    { num: "05", title: t("howItWorks.step5Title"), desc: t("howItWorks.step5Desc") },
  ];

  const payoutTypes = [
    { icon: Dices, title: t("howItWorks.payoutRandomTitle"), desc: t("howItWorks.payoutRandomDesc") },
    { icon: ListOrdered, title: t("howItWorks.payoutFixedTitle"), desc: t("howItWorks.payoutFixedDesc") },
    { icon: Gavel, title: t("howItWorks.payoutAuctionTitle"), desc: t("howItWorks.payoutAuctionDesc") },
    { icon: Vote, title: t("howItWorks.payoutVoteTitle"), desc: t("howItWorks.payoutVoteDesc") },
  ];

  return (
    <div className="auroral-mesh min-h-screen">
      <div className="container-premium py-16">
        <h1 className="holo-text font-heading text-5xl md:text-7xl font-black mb-16 text-center">
          {t("howItWorks.title")}
        </h1>
        <div className="max-w-2xl mx-auto mb-20">
          {steps.map((s, i) => (
            <div key={s.num} className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full gradient-bg-extended flex items-center justify-center text-white font-heading font-bold text-sm shrink-0">
                  {s.num}
                </div>
                {i < steps.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gradient-to-b from-aurora-violet to-transparent mt-2" />
                )}
              </div>
              <div className="pb-10 text-left rtl:text-right">
                <h3 className="font-heading text-lg font-semibold mb-1">{s.title}</h3>
                <p className="text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <h2 className="font-heading text-3xl md:text-4xl gradient-text-extended text-center mb-10">
          {t("howItWorks.payoutModels")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-20">
          {payoutTypes.map((pt) => (
            <div key={pt.title} className="glass-premium rounded-2xl p-6 tilt-hover text-left rtl:text-right">
              <div className="w-10 h-10 rounded-xl gradient-bg-extended flex items-center justify-center text-white mb-2">
                <pt.icon className="h-5 w-5" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">{pt.title}</h3>
              <p className="text-sm text-muted-foreground">{pt.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center p-12 rounded-2xl glass-premium max-w-lg mx-auto">
          <h2 className="font-heading text-2xl font-bold mb-3 gradient-text">
            {t("howItWorks.readyTitle")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("landing.readyDesc")}
          </p>
          <Link
            href="/register"
            className="gradient-bg-premium h-12 px-8 rounded-2xl text-white font-heading font-semibold inline-flex items-center gap-2 holo-glow"
          >
            {t("howItWorks.createAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
