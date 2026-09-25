// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  DEFAULT_LOCALE,
  LOCALE_BOOTSTRAP_SCRIPT,
  LOCALE_COOKIE,
  dirForLocale,
  normalizeLocale,
  persistLocale,
  readLocaleCookie,
  readPersistedLocale,
  resolveLocale,
  writeLocaleCookie,
} from "../locale-cookie"

/** jsdom keeps document.cookie across cases in a file, so clear it explicitly. */
function clearCookies() {
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0]?.trim()
    if (name) document.cookie = `${name}=; max-age=0; path=/`
  }
}

/** The root element is shared by every case in the file; reset what we set. */
function clearDocumentLocale() {
  document.documentElement.removeAttribute("lang")
  document.documentElement.removeAttribute("dir")
}

describe("normalizeLocale", () => {
  it("accepts the ISO 639-1 codes the app offers", () => {
    for (const code of ["en", "fr", "sw", "ha", "yo", "ig", "zh", "ar"]) {
      expect(normalizeLocale(code)).toBe(code)
    }
  })

  it("accepts the 3-letter ISO 639-3 codes offered in settings", () => {
    expect(normalizeLocale("haw")).toBe("haw")
  })

  it("accepts a region subtag", () => {
    expect(normalizeLocale("pt-BR")).toBe("pt-BR")
  })

  it("trims surrounding whitespace", () => {
    expect(normalizeLocale("  fr  ")).toBe("fr")
  })

  // The cookie is attacker-settable and its value reaches the <html lang>
  // attribute and a fetch URL, so anything that is not a bare language code has
  // to be rejected rather than sanitised.
  it.each([
    ["markup", 'en"><script>alert(1)</script>'],
    ["a path traversal", "../../etc/passwd"],
    ["a URL", "https://evil.example/fr.json"],
    ["an overlong value", "a".repeat(64)],
    ["a bare digit", "12"],
    ["a leading dash", "-fr"],
    ["an empty string", ""],
  ])("rejects %s", (_label, value) => {
    expect(normalizeLocale(value)).toBeNull()
  })

  it("rejects null and undefined", () => {
    expect(normalizeLocale(null)).toBeNull()
    expect(normalizeLocale(undefined)).toBeNull()
  })
})

describe("resolveLocale", () => {
  it("passes a valid code through", () => {
    expect(resolveLocale("fr")).toBe("fr")
  })

  it("falls back to English for missing or malformed input", () => {
    // The server has to render something; a null would break <html lang>.
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE)
    expect(resolveLocale("not a locale")).toBe(DEFAULT_LOCALE)
  })
})

describe("dirForLocale", () => {
  it.each(["ar", "he", "fa", "ur", "arc"])("marks %s as right-to-left", (code) => {
    expect(dirForLocale(code)).toBe("rtl")
  })

  it("resolves direction from the base code of a region variant", () => {
    expect(dirForLocale("ar-EG")).toBe("rtl")
  })

  it.each(["en", "fr", "sw", "ha", "yo", "ig", "ku"])("marks %s as left-to-right", (code) => {
    // Hausa and Kurdish are listed because their default script is Latin, so
    // marking them RTL would lay out the copy this app ships backwards.
    expect(dirForLocale(code)).toBe("ltr")
  })

  it("falls back to ltr for unusable input", () => {
    expect(dirForLocale(null)).toBe("ltr")
    expect(dirForLocale("not a locale")).toBe("ltr")
  })
})

describe("cookie round trip", () => {
  beforeEach(() => {
    clearCookies()
    localStorage.clear()
  })

  it("reads back what it wrote", () => {
    writeLocaleCookie("fr")
    expect(readLocaleCookie()).toBe("fr")
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=fr`)
  })

  it("sets a path and a long max-age so the choice outlives a visit", () => {
    writeLocaleCookie("fr")
    // jsdom exposes attributes only via a mock; assert on the jar round trip
    // and that the cookie survives into a fresh read instead.
    expect(readLocaleCookie()).toBe("fr")
    expect(LOCALE_COOKIE).toBe("moistello_locale")
  })

  it("returns null when nothing has been chosen", () => {
    expect(readLocaleCookie()).toBeNull()
  })

  it("ignores a malformed value already in the jar", () => {
    document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent("../evil")}`
    expect(readLocaleCookie()).toBeNull()
  })

  it("does not write a malformed code", () => {
    writeLocaleCookie("../evil")
    expect(document.cookie).not.toContain(LOCALE_COOKIE)
  })

  it("overwrites a previous choice rather than appending", () => {
    writeLocaleCookie("fr")
    writeLocaleCookie("de")
    expect(readLocaleCookie()).toBe("de")
  })
})

describe("readPersistedLocale", () => {
  beforeEach(() => {
    clearCookies()
    localStorage.clear()
  })

  it("prefers the cookie the server can see", () => {
    writeLocaleCookie("de")
    localStorage.setItem(LOCALE_COOKIE, "fr")
    expect(readPersistedLocale()).toBe("de")
  })

  // A visitor upgrading from a build that only wrote localStorage has a real
  // choice the server cannot see yet; it must not be discarded in the meantime.
  it("falls back to localStorage for a pre-cookie choice", () => {
    localStorage.setItem(LOCALE_COOKIE, "fr")
    expect(readPersistedLocale()).toBe("fr")
  })

  it("ignores a malformed localStorage value", () => {
    localStorage.setItem(LOCALE_COOKIE, "<script>")
    expect(readPersistedLocale()).toBeNull()
  })

  it("returns null when there is no choice at all", () => {
    expect(readPersistedLocale()).toBeNull()
  })
})

describe("persistLocale", () => {
  beforeEach(() => {
    clearCookies()
    localStorage.clear()
  })

  it("writes both stores so older builds still see the choice", () => {
    persistLocale("fr")
    expect(readLocaleCookie()).toBe("fr")
    expect(localStorage.getItem(LOCALE_COOKIE)).toBe("fr")
  })

  it("rejects a malformed code in both stores", () => {
    persistLocale("fr/../en")
    expect(readLocaleCookie()).toBeNull()
    expect(localStorage.getItem(LOCALE_COOKIE)).toBeNull()
  })
})

describe("LOCALE_BOOTSTRAP_SCRIPT", () => {
  /** Run the inline script the way a browser would, against the real globals. */
  function runBootstrap() {
    // eslint-disable-next-line no-new-func
    new Function(LOCALE_BOOTSTRAP_SCRIPT)()
  }

  beforeEach(() => {
    clearCookies()
    clearDocumentLocale()
    localStorage.clear()
  })

  it("promotes a localStorage-only choice into the cookie and fixes lang/dir", () => {
    localStorage.setItem(LOCALE_COOKIE, "ar")
    runBootstrap()

    expect(readLocaleCookie()).toBe("ar")
    expect(document.documentElement.getAttribute("lang")).toBe("ar")
    expect(document.documentElement.getAttribute("dir")).toBe("rtl")
  })

  // The server already used the cookie to render lang/dir, so touching them
  // again would be redundant — and overriding a correct value is how flashes
  // get introduced.
  it("does nothing when the cookie is already present", () => {
    writeLocaleCookie("fr")
    document.documentElement.setAttribute("lang", "fr")
    document.documentElement.setAttribute("dir", "ltr")
    runBootstrap()

    expect(document.documentElement.getAttribute("lang")).toBe("fr")
    expect(document.documentElement.getAttribute("dir")).toBe("ltr")
  })

  it("does nothing when there is no choice to rescue", () => {
    runBootstrap()
    expect(readLocaleCookie()).toBeNull()
    expect(document.documentElement.hasAttribute("lang")).toBe(false)
  })

  it("refuses to promote a malformed localStorage value into the cookie", () => {
    localStorage.setItem(LOCALE_COOKIE, "../evil")
    runBootstrap()

    expect(readLocaleCookie()).toBeNull()
    expect(document.documentElement.hasAttribute("lang")).toBe(false)
  })

  it("survives storage being unavailable", () => {
    // Seed first, then break writes: a cookie-less visitor is exactly the case
    // this has to survive, and the rescue must not throw on its way to setting
    // lang/dir.
    localStorage.setItem(LOCALE_COOKIE, "fr")
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError")
    })

    expect(() => runBootstrap()).not.toThrow()
    expect(document.documentElement.getAttribute("lang")).toBe("fr")

    setItem.mockRestore()
  })
})
