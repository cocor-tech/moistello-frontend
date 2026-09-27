import { beforeEach, describe, expect, it } from "vitest"
import { useUIStore } from "@/stores/ui-store"

const STORAGE_KEY = "moistello_theme"

const ui = () => useUIStore.getState()

/**
 * Theme-managed preferences are the only slice persisted by the store. These
 * tests cover the persistence contract (partialize + rehydrate) and the
 * toggleTheme cycle starting from the 'light' edge, complementing the broader
 * store test suite.
 */
describe("useUIStore – theme persistence", () => {
  beforeEach(() => {
    localStorage.clear()
    useUIStore.setState({
      theme: "system",
      density: "comfortable",
      fontSize: "medium",
      sidebarOpen: false,
      commandPaletteOpen: false,
      toasts: [],
    })
  })

  it("persists only theme/density/fontSize (partialize)", () => {
    ui().setTheme("dark")
    ui().setDensity("compact")
    ui().setFontSize("large")

    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    expect(persisted.state).toEqual({
      theme: "dark",
      density: "compact",
      fontSize: "large",
    })
    // Transient UI state must not leak into storage.
    expect(persisted.state.sidebarOpen).toBeUndefined()
    expect(persisted.state.activeModal).toBeUndefined()
    expect(persisted.state.toasts).toBeUndefined()
  })

  it("rehydrates persisted preferences after a simulated reload", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: { theme: "dark", density: "compact", fontSize: "large" },
        version: 0,
      }),
    )

    await useUIStore.persist.rehydrate()

    expect(ui().theme).toBe("dark")
    expect(ui().density).toBe("compact")
    expect(ui().fontSize).toBe("large")
  })

  it("toggles light → dark → system → light", () => {
    useUIStore.setState({ theme: "light" })

    ui().toggleTheme()
    expect(ui().theme).toBe("dark")
    ui().toggleTheme()
    expect(ui().theme).toBe("system")
    ui().toggleTheme()
    expect(ui().theme).toBe("light")
  })

  it("toggles from system to light", () => {
    useUIStore.setState({ theme: "system" })
    ui().toggleTheme()
    expect(ui().theme).toBe("light")
  })

  it("writes the current theme to storage on toggle", () => {
    useUIStore.setState({ theme: "light" })
    ui().toggleTheme()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null").state.theme).toBe("dark")
  })

  it("clearStorage removes the persisted preferences", () => {
    ui().setTheme("dark")
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()

    useUIStore.persist.clearStorage()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})