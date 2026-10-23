import * as Sentry from "@sentry/nextjs"
import { logger, redactString, sanitizeLogContext, SENSITIVE_KEY } from "@/lib/logger"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "production",
    tracesSampleRate: 0.1,
    beforeSend(event: any) {
      if (event.request?.url) {
        event.request.url = redactString(event.request.url)
      }
      if (event.request?.headers) {
        for (const [key, val] of Object.entries(event.request.headers)) {
          if (SENSITIVE_KEY.test(key)) {
            event.request.headers[key] = "[redacted]"
          } else if (typeof val === "string") {
            event.request.headers[key] = redactString(val)
          }
        }
      }
      if (event.request?.data) {
        if (typeof event.request.data === "string") {
          event.request.data = redactString(event.request.data)
        } else if (typeof event.request.data === "object" && event.request.data !== null) {
          event.request.data = sanitizeLogContext(event.request.data)
        }
      }
      if (event.exception?.values) {
        for (const exc of event.exception.values) {
          if (exc.value) {
            exc.value = redactString(exc.value)
          }
          if (exc.stacktrace?.frames) {
            for (const frame of exc.stacktrace.frames) {
              if (frame.vars) {
                frame.vars = sanitizeLogContext(frame.vars)
              }
            }
          }
        }
      }
      if (event.breadcrumbs) {
        for (const b of event.breadcrumbs) {
          if (b.message) b.message = redactString(b.message)
          if (b.data && typeof b.data === "object") {
            b.data = sanitizeLogContext(b.data)
          }
        }
      }
      if (event.extra) {
        event.extra = sanitizeLogContext(event.extra)
      }
      return event
    },
    beforeBreadcrumb(breadcrumb: any) {
      if (breadcrumb.message) {
        breadcrumb.message = redactString(breadcrumb.message)
      }
      if (breadcrumb.data && typeof breadcrumb.data === "object") {
        breadcrumb.data = sanitizeLogContext(breadcrumb.data)
      }
      return breadcrumb
    },
  })
} else {
  logger.warn("Sentry client monitoring is disabled because NEXT_PUBLIC_SENTRY_DSN is not configured")
}
