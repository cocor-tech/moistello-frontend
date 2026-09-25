/**
 * Shared i18n types.
 *
 * Kept in its own module so both the client provider and the server-side
 * dictionary loader can refer to `TranslationDict` without either pulling the
 * other into its bundle. Types are erased at compile time, so importing from
 * here costs nothing at runtime.
 */

/** A flattened translation map: `"nav.wallet" -> "Wallet"`. */
export type TranslationDict = Record<string, string>
