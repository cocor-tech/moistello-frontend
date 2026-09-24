import * as Sentry from "@sentry/nextjs"
import { logger } from "@/lib/logger"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "production",
    tracesSampleRate: 0.1,
  })
} else {
  logger.warn("Sentry server monitoring is disabled because NEXT_PUBLIC_SENTRY_DSN is not configured")
}
