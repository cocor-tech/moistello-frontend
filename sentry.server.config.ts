import * as Sentry from "@sentry/nextjs"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "production",
    tracesSampleRate: 0.1,
  })
} else {
  console.warn("[Sentry] NEXT_PUBLIC_SENTRY_DSN not configured. Server-side error monitoring is disabled. Set NEXT_PUBLIC_SENTRY_DSN in your environment to enable Sentry error tracking.")
}
