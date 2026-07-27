/**
 * In-memory holder for the access token on the client.
 *
 * The token is needed in JavaScript to sign outgoing `Authorization` headers
 * for the API, which lives on a different origin than the app and so never
 * receives our cookies. Keeping it in a module-scoped variable means it lives
 * only for the lifetime of the tab: closing or reloading the page drops it,
 * and nothing is left behind in `localStorage` for a later script to scrape.
 *
 * Its own module rather than a field on the auth store, because both the auth
 * store and the API client need it and importing one from the other would
 * close an import cycle.
 */

let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function clearAccessToken(): void {
  accessToken = null
}
