import { NextResponse } from "next/server"
import { prometheusRegistry } from "@/lib/metrics/prometheus-registry"

export async function GET() {
  const metricsText = prometheusRegistry.generateMetricsText()

  return new NextResponse(metricsText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  })
}
