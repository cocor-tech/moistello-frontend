import { beforeEach, describe, expect, it, vi } from "vitest";

describe("hmac module", () => {
  beforeEach(() => {
    // ensure clean storage and globals between tests
    try {
      localStorage.clear();
    } catch (e) {
      // ignore when not available
    }
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not call fetch at module import time", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const mod = await import("../src/lib/wallet/hmac");
    expect(fetchMock).not.toHaveBeenCalled();
    // sanity: exported helpers exist
    expect(typeof mod.ensureHmacKey).toBe("function");
  });

  it("fetches key on ensureHmacKey and caches it", async () => {
    const keyHex = "aabbccddeeff00112233445566778899";
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ keyHex }) });
    vi.stubGlobal("fetch", fetchMock);
    const mod = await import("../src/lib/wallet/hmac");
    await mod.clearHmacKeyCache();
    const key = await mod.ensureHmacKey();
    expect(key).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // subsequent ensure should use cache (no fetch)
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("fetch called");
      }),
    );
    const key2 = await mod.ensureHmacKey();
    expect(key2).not.toBeNull();
  });

  it("computeHmacSha256Sync honors injected test key", async () => {
    const mod = await import("../src/lib/wallet/hmac");
    // 16-byte key (32 hex chars)
    mod._setHmacKeyForTest("0102030405060708090a0b0c0d0e0f10");
    const res = mod.computeHmacSha256Sync("hello");
    expect(typeof res).toBe("string");
    expect(res.length).toBeGreaterThan(0);
  });

  it("clearHmacKeyCache forces refetch on next ensure", async () => {
    const keyHex1 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const keyHex2 = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const fetchMock1 = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ keyHex: keyHex1 }) });
    vi.stubGlobal("fetch", fetchMock1);
    const mod = await import("../src/lib/wallet/hmac");
    await mod.clearHmacKeyCache();
    const k1 = await mod.ensureHmacKey();
    expect(k1).not.toBeNull();
    expect(fetchMock1).toHaveBeenCalled();

    // now invalidate and ensure new fetch happens
    await mod.clearHmacKeyCache();
    const fetchMock2 = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ keyHex: keyHex2 }) });
    vi.stubGlobal("fetch", fetchMock2);
    const k2 = await mod.ensureHmacKey();
    expect(k2).not.toBeNull();
    expect(fetchMock2).toHaveBeenCalled();
  });
});
