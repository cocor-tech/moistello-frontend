import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  encrypt,
  decrypt,
  encryptToStorage,
  decryptFromStorage,
  isEncrypted,
} from "../encryption";

describe("WebCrypto AES-GCM Storage Encryption (Issue #335)", () => {
  const passphrase = "test-session-passphrase-v1";
  const testData = { userId: "user-123", email: "user@example.com" };

  const mockLocalStorage = new Map<string, string>();

  beforeEach(() => {
    mockLocalStorage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => mockLocalStorage.get(key) ?? null,
      setItem: (key: string, value: string) => mockLocalStorage.set(key, value),
      removeItem: (key: string) => mockLocalStorage.delete(key),
    });
  });

  it("encrypts and decrypts payload successfully (round-trip)", async () => {
    const jsonStr = JSON.stringify(testData);
    const encrypted = await encrypt(jsonStr, passphrase);

    expect(encrypted.version).toBe(1);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.salt).toBeDefined();

    const decrypted = await decrypt(encrypted, passphrase);
    expect(JSON.parse(decrypted)).toEqual(testData);
  });

  it("fails to decrypt when given wrong passphrase (tamper/key mismatch)", async () => {
    const encrypted = await encrypt(JSON.stringify(testData), passphrase);
    await expect(decrypt(encrypted, "wrong-passphrase")).rejects.toThrow();
  });

  it("fails to decrypt when ciphertext is tampered", async () => {
    const encrypted = await encrypt(JSON.stringify(testData), passphrase);
    // Alter last character of base64 ciphertext
    const tamperedPayload = {
      ...encrypted,
      ciphertext: encrypted.ciphertext.substring(0, encrypted.ciphertext.length - 4) + "AAAA",
    };
    await expect(decrypt(tamperedPayload, passphrase)).rejects.toThrow();
  });

  it("encrypts to storage and decrypts from storage correctly", async () => {
    const key = "moistello_test_user";
    await encryptToStorage(key, testData, passphrase);

    expect(isEncrypted(key)).toBe(true);

    const restored = await decryptFromStorage<typeof testData>(key, passphrase);
    expect(restored).toEqual(testData);
  });

  it("clears storage and returns null when decryptFromStorage encounters tampered payload", async () => {
    const key = "moistello_test_user";
    await encryptToStorage(key, testData, passphrase);

    // Tamper the stored value
    const raw = localStorage.getItem(key)!;
    const parsed = JSON.parse(raw);
    parsed.ciphertext = "invalid-ciphertext";
    localStorage.setItem(key, JSON.stringify(parsed));

    const restored = await decryptFromStorage<typeof testData>(key, passphrase);
    expect(restored).toBeNull();
    expect(localStorage.getItem(key)).toBeNull(); // Graceful clearing
  });
});
