"use client";

import { useTranslate } from "@/lib/locale/context";

export function PrivacyContent() {
  const { t } = useTranslate();

  const sections = [
    { title: t("privacy.collectedTitle"), text: t("privacy.collectedText") },
    { title: t("privacy.usageTitle"), text: t("privacy.usageText") },
    { title: t("privacy.storageTitle"), text: t("privacy.storageText") },
    { title: t("privacy.sharingTitle"), text: t("privacy.sharingText") },
    { title: t("privacy.securityTitle"), text: t("privacy.securityText") },
    { title: t("privacy.rightsTitle"), text: t("privacy.rightsText") },
  ];

  return (
    <div className="auroral-mesh min-h-screen">
      <div className="container-premium py-16 max-w-3xl mx-auto text-left rtl:text-right">
        <h1 className="holo-text font-heading text-5xl md:text-7xl font-black mb-2">
          {t("privacy.policyTitle")}
        </h1>
        <p className="text-muted-foreground mb-10">
          {t("privacy.policyLastUpdated")}
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
