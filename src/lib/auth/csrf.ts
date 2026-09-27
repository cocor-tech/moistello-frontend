const CSRF_COOKIE_NAMES = ["__Host-moistello_csrf", "moistello_csrf"] as const

/** Read the current double-submit token, preferring the rotated cookie over the page meta tag. */
export function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined

  for (const name of CSRF_COOKIE_NAMES) {
    for (const part of document.cookie.split(";")) {
      const separator = part.indexOf("=")
      if (separator < 0 || part.slice(0, separator).trim() !== name) continue
      const value = part.slice(separator + 1).trim()
      if (!value) continue
      try {
        return decodeURIComponent(value)
      } catch {
        return value
      }
    }
  }

  return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || undefined
}

export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken()
  return token ? { "X-CSRF-Token": token } : {}
}
