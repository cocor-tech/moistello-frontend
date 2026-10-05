/**
 * Polls `checkSession` (resolves true once the session cookie is
 * established) with a bounded number of attempts, instead of redirecting
 * immediately. That's what stops the post-verification redirect from
 * bouncing between the verification callback and the dashboard when the
 * session isn't established yet (issue #494) — after `maxAttempts` it gives
 * up and returns false rather than looping forever.
 */
export async function waitForSessionEstablished(
  checkSession: () => Promise<boolean>,
  { maxAttempts = 5, delayMs = 300 }: { maxAttempts?: number; delayMs?: number } = {},
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (await checkSession()) return true
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  return false
}
