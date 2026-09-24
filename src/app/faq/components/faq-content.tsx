"use client";

import Link from "next/link";
import { useTranslate } from "@/lib/locale/context";

export function FAQContent() {
  const { t } = useTranslate();

  const faqs = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
    { q: t("faq.q5"), a: t("faq.a5") },
    { q: t("faq.q6"), a: t("faq.a6") },
    { q: t("faq.q7"), a: t("faq.a7") },
  ];

  return (
    <div className="auroral-mesh min-h-screen">
      <div className="container-premium py-16">
        <h1 className="holo-text font-heading text-5xl md:text-7xl font-black mb-16 text-center">
          {t("faq.title")}
        </h1>
        <div className="max-w-2xl mx-auto space-y-3 mb-16">
          {faqs.map((faq, i) => (
            <details key={i} className="glass rounded-2xl group cursor-pointer overflow-hidden">
              <summary className="flex items-center justify-between p-5 font-heading text-lg font-medium hover:text-foreground transition-colors">
                <span className="text-left rtl:text-right">{faq.q}</span>
                <span className="text-xl text-muted-foreground group-open:rotate-45 transition-transform shrink-0 ml-4 rtl:ml-0 rtl:mr-4">
                  +
                </span>
              </summary>
              <div className="px-5 pb-5 text-muted-foreground leading-relaxed text-left rtl:text-right">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
        <div className="text-center p-8 rounded-2xl glass-premium max-w-md mx-auto">
          <h2 className="font-heading text-xl font-bold mb-2">
            {t("faq.stillQuestions")}
          </h2>
          <p className="text-muted-foreground mb-4">
            {t("faq.stillQuestionsDesc")}
          </p>
          <Link
            href="/register"
            className="gradient-bg-premium h-10 px-6 rounded-xl text-white font-heading font-semibold inline-flex items-center gap-2"
          >
            {t("faq.getStarted")}
          </Link>
        </div>
      </div>
    </div>
  );
}
