"use client";

import { Activity, CheckCircle, Clock } from "lucide-react";
import { useTranslate } from "@/lib/locale/context";

const STATUS_DATA = {
  frontend: { statusKey: "status.operational", uptime: "99.9%", responseTime: "42ms" },
  api: { statusKey: "status.operational", uptime: "99.8%", responseTime: "87ms" },
  database: { statusKey: "status.operational", uptime: "99.9%", responseTime: "12ms" },
};

export function StatusContent() {
  const { t } = useTranslate();

  return (
    <div className="min-h-screen bg-background">
      <section className="container-premium pt-24 pb-16">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-cyan/15 text-aurora-cyan">
              <Activity className="h-5 w-5" />
            </span>
            <h1 className="font-heading text-3xl md:text-4xl font-bold gradient-text-extended">
              {t("status.title")}
            </h1>
          </div>

          <div className="space-y-4">
            {Object.entries(STATUS_DATA).map(([service, data]) => (
              <div
                key={service}
                className="rounded-2xl bg-card/60 backdrop-blur-xl border border-white/10 p-6 flex items-center justify-between transition-transform duration-300 hover:scale-[1.02]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div className="text-left rtl:text-right">
                    <h3 className="font-heading text-lg font-semibold text-foreground capitalize">
                      {t(`status.${service}`) || service}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("status.response")}: {data.responseTime}
                    </p>
                  </div>
                </div>
                <div className="text-right rtl:text-left">
                  <p className="text-emerald-400 font-semibold capitalize">
                    {t(data.statusKey)}
                  </p>
                  <p className="text-xs text-muted-foreground">{data.uptime} uptime</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10 text-left rtl:text-right">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-aurora-violet" />
              <p className="text-sm font-medium text-foreground">
                {t("status.allOperational") || "All Systems Operational"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("status.subtitle") || "All systems operational. No incidents reported in the last 24 hours."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
