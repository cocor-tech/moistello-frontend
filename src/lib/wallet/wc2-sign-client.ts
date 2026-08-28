/**
 * Shared, lazy singleton for @walletconnect/sign-client.
 *
 * Both walletconnect.ts adapter and wc2-session-manager.ts previously
 * called `import("@walletconnect/sign-client")` independently, which could
 * cause the bundler to emit the chunk twice and the runtime to initialise
 * two separate SDK instances.  This module serialises the import behind a
 * single promise so the heavy chunk is loaded at most once per page load,
 * regardless of which consumer reaches it first.
 *
 * Usage:
 *   import { getSignClientClass } from "@/lib/wallet/wc2-sign-client"
 *   const SignClient = await getSignClientClass()
 *   const client = await SignClient.init({ ... })
 */

type SignClientConstructor = {
  init: (opts: {
    projectId?: string
    relayUrl?: string
    metadata?: {
      name: string
      description: string
      url: string
      icons: string[]
    }
  }) => Promise<unknown>
}

let _importPromise: Promise<SignClientConstructor> | null = null

/**
 * Returns the `SignClient` constructor from `@walletconnect/sign-client`.
 * The dynamic import is performed at most once per runtime; subsequent calls
 * receive the same resolved value from the cached promise.
 */
export async function getSignClientClass(): Promise<SignClientConstructor> {
  if (!_importPromise) {
    _importPromise = import("@walletconnect/sign-client").then(
      (mod) => mod.SignClient as unknown as SignClientConstructor,
    )
  }
  return _importPromise
}

/**
 * Reset the cached import promise.  Only used in tests to keep them
 * isolated from one another.
 *
 * @internal
 */
export function _resetSignClientCache(): void {
  _importPromise = null
}
