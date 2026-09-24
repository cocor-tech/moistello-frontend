"use client";

import { useTranslate } from "@/lib/locale/context";

export function TermsContent() {
  const { t } = useTranslate();

  const sections = [
    { title: t("terms.acceptanceTitle"), text: t("terms.acceptanceText") },
    { title: t("terms.serviceTitle"), text: t("terms.serviceText") },
    { title: t("terms.eligibilityTitle"), text: t("terms.eligibilityText") },
    { title: t("terms.responsibilitiesTitle"), text: t("terms.responsibilitiesText") },
    { title: t("terms.noAdviceTitle"), text: t("terms.noAdviceText") },
    { title: t("terms.smartContractRiskTitle"), text: t("terms.smartContractRiskText") },
    { title: t("terms.liabilityTitle"), text: t("terms.liabilityText") },
    { title: t("terms.governingLawTitle"), text: t("terms.governingLawText") },
  ];

  return (
    <div className="auroral-mesh min-h-screen">
      <div className="container-premium py-16 max-w-3xl mx-auto text-left rtl:text-right">
        <h1 className="holo-text font-heading text-5xl md:text-7xl font-black mb-2">
          {t("terms.title")}
        </h1>
        <p className="text-muted-foreground mb-10">
          {t("terms.lastUpdated")}
        </p>
        <div className="glass-premium rounded-2xl p-8 space-y-6">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="font-heading text-lg font-semibold gradient-text mb-2">
                {s.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
