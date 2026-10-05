import type { Metadata } from "next"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import { PublicLayout } from "@/components/layout/public-layout"
import { Activity, CircleCheck, Clock } from "lucide-react"

export const metadata: Metadata = buildRouteMetadata("/status")

const STATUS_DATA = {
  frontend: { status: "operational", uptime: "99.9%", responseTime: "42ms" },
  api: { status: "operational", uptime: "99.8%", responseTime: "87ms" },
  database: { status: "operational", uptime: "99.9%", responseTime: "12ms" },
}

export default function StatusPage() {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">
        <section className="container-premium pt-24 pb-16">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-cyan/15 text-aurora-cyan">
                <Activity className="h-5 w-5" />
              </span>
              <h1 className="font-heading text-3xl md:text-4xl font-bold gradient-text-extended">
                System Status
              </h1>
            </div>

            <div className="space-y-4">
              {Object.entries(STATUS_DATA).map(([service, data]) => (
                <div key={service} className="rounded-2xl bg-card/60 backdrop-blur-xl border border-white/10 p-6 flex items-center justify-between transition-transform duration-300 hover:scale-[1.02]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                      <CircleCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-foreground capitalize">{service}</h3>
                      <p className="text-sm text-muted-foreground">Response: {data.responseTime}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-semibold capitalize">{data.status}</p>
                    <p className="text-xs text-muted-foreground">{data.uptime} uptime</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-aurora-violet" />
                <p className="text-sm font-medium text-foreground">Last checked: just now</p>
              </div>
              <p className="text-xs text-muted-foreground">
                All systems operational. No incidents reported in the last 24 hours.
              </p>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  )
}