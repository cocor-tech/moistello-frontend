import { describe, it, expect } from "vitest"
import { GET } from "../route"
import { prometheusRegistry } from "@/lib/metrics/prometheus-registry"

describe("GET /api/metrics", () => {
  it("returns 200 with Prometheus metrics text content type", async () => {
    prometheusRegistry.cursorLag.set(3)

    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("text/plain; version=0.0.4; charset=utf-8")

    const body = await response.text()
    expect(body).toContain("cursor_lag 3")
    expect(body).toContain("events_processed")
    expect(body).toContain("events_failed")
  })
})
