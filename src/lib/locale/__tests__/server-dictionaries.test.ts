// @vitest-environment node
import { describe, expect, it } from "vitest"
import { getServerDictionary, hasServerDictionary } from "../server-dictionaries"
import { EN_SEED } from "../en-seed"

import en from "../en.json"
import fr from "../fr.json"

describe("getServerDictionary", () => {
  it("returns the full English dictionary, not the 27-key seed", () => {
    // This value becomes the first paint. A seed here is a screen of raw keys
    // and raw English where the visitor chose otherwise.
    const dict = getServerDictionary("en")
    expect(Object.keys(dict).length).toBeGreaterThan(Object.keys(EN_SEED).length)
    expect(dict["nav.settings"]).toBe("Settings")
  })

  it("returns the French dictionary", () => {
    expect(getServerDictionary("fr")["nav.wallet"]).toBe("Portefeuille")
  })

  it("resolves a region variant to its base language", () => {
    expect(getServerDictionary("fr-CA")).toBe(fr)
    expect(getServerDictionary("pt-BR")).toBe(en)
  })

  it("falls back to English for a locale the server cannot render", () => {
    // The long tail of 184 codes is generated from English, so English is the
    // correct render — but it must be the real dictionary, not a stub.
    expect(getServerDictionary("sw")).toBe(en)
  })

  it("falls back to English for junk input", () => {
    expect(getServerDictionary("")).toBe(en)
    expect(getServerDictionary("../evil")).toBe(en)
  })

  it("keeps the served dictionaries key-identical to English", () => {
    // A missing key renders as the key itself, so a gap is a visible glitch.
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort())
  })

  it("holds only string values, as the provider requires", () => {
    for (const dict of [en, fr]) {
      for (const value of Object.values(dict)) {
        expect(typeof value).toBe("string")
      }
    }
  })
})

describe("hasServerDictionary", () => {
  it("recognises the locales the server can render", () => {
    expect(hasServerDictionary("en")).toBe(true)
    expect(hasServerDictionary("fr")).toBe(true)
    expect(hasServerDictionary("fr-CA")).toBe(true)
  })

  it("rejects locales that need a client fetch", () => {
    expect(hasServerDictionary("sw")).toBe(false)
    expect(hasServerDictionary("")).toBe(false)
  })
})
