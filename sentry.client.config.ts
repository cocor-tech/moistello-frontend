import * as Sentry from "@sentry/nextjs"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "production",
    tracesSampleRate: 0.1,
    beforeSend(event: any) {
      if (event.request?.url) {
        event.request.url = event.request.url.replace(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
          "[email]"
        )
      }
      if (event.exception?.values) {
        for (const exc of event.exception.values) {
          if (exc.value) {
            exc.value = exc.value
              .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
              .replace(/G[A-Za-z0-9]{55}/g, "[stellar-address]")
              .replace(/0x[a-fA-F0-9]{40}/g, "[evm-address]")
          }
        }
      }
      return event
    },
    beforeBreadcrumb(breadcrumb: any) {
      if (breadcrumb.message) {
        breadcrumb.message = breadcrumb.message
          .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
      }
      return breadcrumb
    },
  })
} else {
  console.warn("[Sentry] NEXT_PUBLIC_SENTRY_DSN not configured. Error monitoring is disabled. Set NEXT_PUBLIC_SENTRY_DSN in your environment to enable Sentry error tracking.")
}
