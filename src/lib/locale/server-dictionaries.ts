/**
 * Dictionaries the server can render with, imported statically.
 *
 * The client loads translations by fetching `/locale/{code}.json` at runtime,
 * which by definition cannot happen during SSR — the first paint would always be
 * English and then visibly swap, even when `<html lang>` already said "fr".
 * To render the right copy on the very first paint the server has to hold the
 * dictionary itself, so the fully translated locales are compiled into the
 * server bundle and resolved here.
 *
 * Only locales that are actually translated belong in this map. The long tail of
 * 184 offered codes is generated from English by scripts/build-locales.js and
 * served as static files, so those still resolve client-side — and to English
 * here, which is exactly what the generated file contains.
 *
 * SERVER ONLY. These are ~30 KB of JSON per locale; importing this module from
 * a client component would ship every dictionary to the browser. Only the
 * *type* is safe to share, and that lives in ./types.
 */
import en from "./en.json"
import fr from "./fr.json"
import { DEFAULT_LOCALE } from "./locale-cookie"
import type { TranslationDict } from "./types"

const SERVER_DICTIONARIES: Record<string, TranslationDict> = { en, fr }

/**
 * The dictionary to render `code` with on the server.
 *
 * Falls back to the base language for region-qualified codes (`fr-CA` -> `fr`),
 * then to English. Returning the English dictionary rather than a 27-key seed
 * matters: this value is what the first paint shows, so a stub here is a screen
 * full of raw translation keys.
 */
export function getServerDictionary(code: string): TranslationDict {
  const direct = SERVER_DICTIONARIES[code]
  if (direct) return direct

  const base = code.split("-")[0]
  if (base !== code) {
    const byBase = SERVER_DICTIONARIES[base]
    if (byBase) return byBase
  }

  return SERVER_DICTIONARIES[DEFAULT_LOCALE]
}

/** True when the server can render this locale itself, with no client fetch. */
export function hasServerDictionary(code: string): boolean {
  return code in SERVER_DICTIONARIES || code.split("-")[0] in SERVER_DICTIONARIES
}
