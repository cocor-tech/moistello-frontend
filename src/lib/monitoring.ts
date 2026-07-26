"use client"

import * as Sentry from "@sentry/nextjs"
import type { AuthErrorCode } from "@/stores/auth-flow-store"

export type MetricName =
  | "governance.proposal.created"
  | "governance.proposal.executed"
  | "governance.vote.cast"
  | "governance.timelock.expired"
  | "reputation.tier.upgraded"
  | "reputation.tier.downgraded"
  | "wallet.connect.attempt"
  | "wallet.connect.success"
  | "wallet.connect.failure"
  | "wallet.sign.attempt"
  | "wallet.sign.success"
  | "wallet.sign.failure"
  | "feature.flag.toggled"
  | "page.view"
  | "error.unhandled"
  | "auth.flow.started"
  | "auth.login.no_credential"
  | "auth.sign.completed"
  | "auth.error.caught"

interface AuthErrorContext {
  step?: string
  mode?: string
  walletId?: string | null
  errorCode?: AuthErrorCode | string
  address?: string | null
}

export interface MetricEvent {
  name: MetricName
  value?: number
  tags?: Record<string, string>
  timestamp: number
}

const METRIC_FLUSH_SIZE = 50
const METRIC_FLUSH_INTERVAL = 30_000
const MAX_BUFFER_SIZE = 500

let metricBuffer: MetricEvent[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null

function stripPii(value: string): string {
  return value
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
    .replace(/G[A-Za-z0-9]{55}/g, "[stellar-address]")
    .replace(/0x[a-fA-F0-9]{40}/g, "[evm-address]")
}

export function captureAuthError(error: unknown, context: AuthErrorContext): void {
  const tags: Record<string, string> = {
    step: context.step ?? "unknown",
    mode: context.mode ?? "unknown",
    errorCode: context.errorCode ?? "unknown",
  }

  if (context.walletId) tags.walletId = context.walletId

  recordMetric("auth.error.caught", 1, tags)

  const dsn = typeof process !== "undefined"
    ? (process.env as Record<string, string>).NEXT_PUBLIC_SENTRY_DSN
    : undefined

  if (dsn) {
    Sentry.withScope((scope) => {
      scope.setTags(tags)
      scope.setExtra("mode", context.mode ?? "unknown")
      scope.setExtra("step", context.step ?? "unknown")
      scope.addBreadcrumb({
        category: "auth",
        message: `Auth error in ${context.mode}/${context.step}`,
        level: "error",
      })

      if (error instanceof Error) {
        const stripped = {
          ...error,
          message: stripPii(error.message),
          stack: error.stack ? stripPii(error.stack) : undefined,
        }
        Sentry.captureException(stripped)
      } else {
        Sentry.captureException(typeof error === "string" ? stripPii(error) : error)
      }
    })
  } else {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[AuthError] [${context.mode}/${context.step}] ${message}`, tags)
  }
}

export function recordMetric(
  name: MetricName,
  value?: number,
  tags?: Record<string, string>,
): void {
  const event: MetricEvent = {
    name,
    value,
    tags,
    timestamp: Date.now(),
  }
  metricBuffer.push(event)

  if (metricBuffer.length >= MAX_BUFFER_SIZE) {
    metricBuffer.splice(0, metricBuffer.length - MAX_BUFFER_SIZE)
  }

  if (metricBuffer.length >= METRIC_FLUSH_SIZE) {
    flushMetrics()
  }
}

function startFlushTimer(): void {
  if (flushTimer) return
  flushTimer = setInterval(flushMetrics, METRIC_FLUSH_INTERVAL)
}

export function flushMetrics(): void {
  if (metricBuffer.length === 0) return
  const batch = metricBuffer.splice(0, metricBuffer.length)

  const endpoint = typeof process !== "undefined"
    ? (process.env as Record<string, string>).NEXT_PUBLIC_METRICS_ENDPOINT
    : undefined

  if (endpoint) {
    const payload = JSON.stringify(batch)

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(endpoint, payload)
    } else {
      fetch(endpoint, {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {
        metricBuffer.unshift(...batch)
      })
    }
  } else {
    // Only warn once per session to avoid spam
    if (typeof window !== "undefined" && !(window as any).__metricsWarned) {
      console.warn("[Metrics] NEXT_PUBLIC_METRICS_ENDPOINT not configured. Metrics collection is disabled. Set NEXT_PUBLIC_METRICS_ENDPOINT in your environment to enable metrics tracking.")
      ;(window as any).__metricsWarned = true
    }
  }
}

export function flushMetricsOnUnload(): void {
  if (typeof window === "undefined") return
  window.addEventListener("beforeunload", () => {
    flushMetrics()
  })
  window.addEventListener("pagehide", () => {
    flushMetrics()
  })
}

export function initMonitoring(): void {
  if (typeof window === "undefined") return
  startFlushTimer()
  flushMetricsOnUnload()

  const pagePath = window.location.pathname
  recordMetric("page.view", 1, { path: pagePath })

  window.addEventListener("error", (event) => {
    Sentry.captureException(event.error ?? event.message)
    recordMetric("error.unhandled", 1, {
      message: event.message,
      source: event.filename || "unknown",
    })
  })

  window.addEventListener("unhandledrejection", (event) => {
    Sentry.captureException(event.reason ?? event.reason?.message)
    recordMetric("error.unhandled", 1, {
      message: event.reason?.message || String(event.reason),
      source: "unhandled-rejection",
    })
  })
}

export function getMetricBufferSize(): number {
  return metricBuffer.length
}

export function resetMetrics(): void {
  metricBuffer = []
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
}
