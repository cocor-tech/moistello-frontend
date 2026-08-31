import "@testing-library/jest-dom/vitest"

class StorageMock implements Storage {
  [name: string]: any

  get length() {
    return Object.keys(this).filter(
      (k) => !["length", "clear", "getItem", "key", "removeItem", "setItem"].includes(k)
    ).length
  }

  clear() {
    for (const key of Object.keys(this)) {
      if (!["length", "clear", "getItem", "key", "removeItem", "setItem"].includes(key)) {
        delete this[key]
      }
    }
  }

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this, key) ? String(this[key]) : null
  }

  key(index: number): string | null {
    const keys = Object.keys(this).filter(
      (k) => !["length", "clear", "getItem", "key", "removeItem", "setItem"].includes(k)
    )
    return keys[index] ?? null
  }

  removeItem(key: string) {
    delete this[key]
  }

  setItem(key: string, value: string) {
    this[key] = String(value)
  }
}

// In Node 22+, globalThis.localStorage is partially defined but non-functional without a file.
// Ensure functional localStorage and sessionStorage exist on both window and globalThis.
const mockLocal = new StorageMock()
const mockSession = new StorageMock()

try {
  globalThis.localStorage.setItem("__test", "1")
  globalThis.localStorage.removeItem("__test")
} catch {
  Object.defineProperty(globalThis, "localStorage", { value: mockLocal, configurable: true, writable: true })
  Object.defineProperty(globalThis, "sessionStorage", { value: mockSession, configurable: true, writable: true })
}

if (typeof window !== "undefined") {
  try {
    window.localStorage.setItem("__test", "1")
    window.localStorage.removeItem("__test")
  } catch {
    Object.defineProperty(window, "localStorage", { value: mockLocal, configurable: true, writable: true })
    Object.defineProperty(window, "sessionStorage", { value: mockSession, configurable: true, writable: true })
  }
}
