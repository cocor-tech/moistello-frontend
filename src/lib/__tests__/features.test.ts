import { afterEach, describe, expect, it, vi } from "vitest"
import {
  isFeatureEnabled,
  isGovernanceEnabled,
  isHardwareWalletEnabled,
  isPasskeyEnabled,
  isReputationTiersEnabled,
  isWalletConnectEnabled,
} from "../features"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("isFeatureEnabled", () => {
  it("returns false when window is undefined (SSR)", () => {
    const originalWindow = global.window
    // @ts-expect-error intentionally deleting window to simulate SSR
    delete global.window
    expect(isFeatureEnabled("NEXT_PUBLIC_FEATURE_GOVERNANCE")).toBe(false)
    global.window = originalWindow
  })

  it("returns true when the env var is not set", () => {
    expect(isFeatureEnabled("NEXT_PUBLIC_FEATURE_GOVERNANCE")).toBe(true)
  })

  it('returns false when the env var is "false"', () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_GOVERNANCE", "false")
    expect(isFeatureEnabled("NEXT_PUBLIC_FEATURE_GOVERNANCE")).toBe(false)
  })

  it('returns false when the env var is "0"', () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_GOVERNANCE", "0")
    expect(isFeatureEnabled("NEXT_PUBLIC_FEATURE_GOVERNANCE")).toBe(false)
  })

  it("returns true for any other non-empty value", () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_GOVERNANCE", "1")
    expect(isFeatureEnabled("NEXT_PUBLIC_FEATURE_GOVERNANCE")).toBe(true)
  })
})

describe("named feature flag helpers", () => {
  it("isGovernanceEnabled delegates to the correct env var", () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_GOVERNANCE", "false")
    expect(isGovernanceEnabled()).toBe(false)
  })

  it("isReputationTiersEnabled delegates to the correct env var", () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_REPUTATION_TIERS", "false")
    expect(isReputationTiersEnabled()).toBe(false)
  })

  it("isPasskeyEnabled delegates to the correct env var", () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_PASSKEY", "false")
    expect(isPasskeyEnabled()).toBe(false)
  })

  it("isHardwareWalletEnabled delegates to the correct env var", () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_HARDWARE_WALLET", "false")
    expect(isHardwareWalletEnabled()).toBe(false)
  })

  it("isWalletConnectEnabled delegates to the correct env var", () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_WALLETCONNECT", "false")
    expect(isWalletConnectEnabled()).toBe(false)
  })

  it("all named helpers return true when their env vars are unset", () => {
    expect(isGovernanceEnabled()).toBe(true)
    expect(isReputationTiersEnabled()).toBe(true)
    expect(isPasskeyEnabled()).toBe(true)
    expect(isHardwareWalletEnabled()).toBe(true)
    expect(isWalletConnectEnabled()).toBe(true)
  })
})
