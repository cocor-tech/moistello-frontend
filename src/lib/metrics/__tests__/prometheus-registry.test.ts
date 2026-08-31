import { describe, it, expect, beforeEach } from "vitest"
import { PrometheusRegistry } from "../prometheus-registry"

describe("PrometheusRegistry", () => {
  let registry: PrometheusRegistry

  beforeEach(() => {
    registry = new PrometheusRegistry()
  })

  it("records events_processed counter correctly", () => {
    registry.eventsProcessed.inc({ event_type: "CircleCreated", status: "success" })
    registry.eventsProcessed.inc({ event_type: "CircleCreated", status: "success" })

    const text = registry.eventsProcessed.toPrometheusFormat()
    expect(text).toContain("events_processed")
    expect(text).toContain('event_type="CircleCreated",status="success"} 2')
  })

  it("records events_failed counter correctly", () => {
    registry.eventsFailed.inc({ error_type: "NetworkTimeout" })
    const text = registry.eventsFailed.toPrometheusFormat()
    expect(text).toContain('error_type="NetworkTimeout"} 1')
  })

  it("records cursor_lag gauge correctly", () => {
    registry.cursorLag.set(12)
    expect(registry.cursorLag.get()).toBe(12)

    const text = registry.cursorLag.toPrometheusFormat()
    expect(text).toContain("cursor_lag 12")
  })

  it("records db_write_latency histogram correctly", () => {
    registry.dbWriteLatency.observe(15)
    registry.dbWriteLatency.observe(80)

    const text = registry.dbWriteLatency.toPrometheusFormat()
    expect(text).toContain("db_write_latency_bucket")
    expect(text).toContain("db_write_latency_count 2")
  })

  it("records reconciler_runs counter correctly", () => {
    registry.reconcilerRuns.inc({ status: "success" })
    const text = registry.reconcilerRuns.toPrometheusFormat()
    expect(text).toContain('status="success"} 1')
  })

  it("generates full metrics exposition text", () => {
    registry.eventsProcessed.inc({ event_type: "Deposit", status: "success" })
    registry.cursorLag.set(5)

    const output = registry.generateMetricsText()
    expect(output).toContain("events_processed")
    expect(output).toContain("events_failed")
    expect(output).toContain("cursor_lag 5")
    expect(output).toContain("db_write_latency")
    expect(output).toContain("reconciler_runs")
  })
})
