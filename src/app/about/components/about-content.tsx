"use client";

import { useTranslate } from "@/lib/locale/context";

export function AboutContent() {
  const { t } = useTranslate();

  return (
    <div className="auroral-mesh min-h-screen">
      <main className="container-premium py-16">
        <h1 className="holo-text font-heading text-5xl md:text-7xl font-black mb-8">
          {t("about.title")}
        </h1>
        <div className="space-y-6 max-w-3xl">
          <div className="glass-premium rounded-2xl p-8 holo-border border-l-4 border-l-aurora-indigo rtl:border-l-0 rtl:border-r-4 rtl:border-r-aurora-indigo">
            <h2 className="font-heading text-xl font-semibold mb-3 gradient-text">
              {t("about.missionTitle")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("about.missionDesc")}
            </p>
          </div>
          <div className="glass rounded-2xl p-8 border-l-4 border-l-aurora-violet rtl:border-l-0 rtl:border-r-4 rtl:border-r-aurora-violet">
            <h2 className="font-heading text-xl font-semibold mb-3 gradient-text">
              {t("about.whyStellarTitle")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("about.whyStellarDesc")}
            </p>
          </div>
          <div className="glass rounded-2xl p-8 border-l-4 border-l-aurora-cyan rtl:border-l-0 rtl:border-r-4 rtl:border-r-aurora-cyan">
            <h2 className="font-heading text-xl font-semibold mb-3 gradient-text">
              {t("about.openSourceTitle")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("about.openSourceDesc")}
            </p>
          </div>
          <div className="glass rounded-2xl p-8 border-l-4 border-l-premium-gold rtl:border-l-0 rtl:border-r-4 rtl:border-r-premium-gold">
            <h2 className="font-heading text-xl font-semibold mb-3 gradient-text-gold">
              {t("about.contactTitle")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("about.contactDesc")}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
