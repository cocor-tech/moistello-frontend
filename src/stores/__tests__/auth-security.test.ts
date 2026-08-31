/**
 * Security tests for authentication token handling.
 *
 * Verifies that sensitive auth data (nonce, signature, tokens) is never
 * persisted to localStorage to prevent XSS exfiltration.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthFlowStore } from "../auth-flow-store";
import { useAuthStore } from "../auth-store";
import { _setHmacKeyForTest } from "@/lib/wallet/hmac";

describe("Auth Security - Token Storage", () => {
  beforeEach(() => {
    // Clear all stores and localStorage
    localStorage.clear();
    _setHmacKeyForTest("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
    useAuthFlowStore.getState().reset();
    useAuthStore.getState().logout();
  });

  describe("AuthFlowStore", () => {
    it("should not persist auth nonce to localStorage", () => {
      const store = useAuthFlowStore.getState();

      // Simulate setting a nonce during auth flow
      store.setNonce("test-nonce-123");

      // Check localStorage
      const stored = localStorage.getItem("moistello-auth-flow");
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.state).toBeDefined();
      expect(parsed.state.auth).toBeUndefined();
      expect(parsed.state.nonce).toBeUndefined();
    });

    it("should not persist signature to localStorage", () => {
      const store = useAuthFlowStore.getState();

      // Simulate successful signing
      store.signSuccess("test-signature", "test-nonce");

      // Check localStorage
      const stored = localStorage.getItem("moistello-auth-flow");
      const parsed = JSON.parse(stored!);

      expect(parsed.state.auth).toBeUndefined();
      expect(parsed.state.signature).toBeUndefined();
    });

    it("should persist non-sensitive profile data", () => {
      const store = useAuthFlowStore.getState();

      store.updateProfileField("displayName", "Test User");
      store.updateProfileField("countryCode", "US");

      const stored = localStorage.getItem("moistello-auth-flow");
      const parsed = JSON.parse(stored!);

      expect(parsed.state.profile).toBeDefined();
      expect(parsed.state.profile.displayName).toBe("Test User");
      expect(parsed.state.profile.countryCode).toBe("US");
    });

    it("should persist connection metadata without secrets", () => {
      const store = useAuthFlowStore.getState();

      store.connectSuccess("freighter", "GACCOUNT123");

      const stored = localStorage.getItem("moistello-auth-flow");
      const parsed = JSON.parse(stored!);

      expect(parsed.state.connection).toBeDefined();
      expect(parsed.state.connection.walletId).toBe("freighter");
      expect(parsed.state.connection.address).toBe("GACCOUNT123");
      // Pairing URI should not be persisted
      expect(parsed.state.connection.pairingUri).toBeUndefined();
    });
  });

  describe("AuthStore", () => {
    it("should not persist access token to localStorage", () => {
      const store = useAuthStore.getState();

      // Check all localStorage keys
      const allKeys = Object.keys(localStorage);
      const tokenKeys = allKeys.filter(
        (k) =>
          k.includes("token") ||
          k.includes("access") ||
          k.includes("refresh") ||
          k.includes("jwt"),
      );

      expect(tokenKeys).toHaveLength(0);
    });

    it("should clear legacy token storage on init", async () => {
      // Simulate legacy tokens in storage
      localStorage.setItem("moistello_token", "legacy-token");
      localStorage.setItem("moistello_refresh", "legacy-refresh");
      localStorage.setItem("moistello_access_token", "legacy-access");

      // Re-import to trigger cleanup
      vi.resetModules();
      await import("../auth-store");

      // Legacy keys should be removed
      expect(localStorage.getItem("moistello_token")).toBeNull();
      expect(localStorage.getItem("moistello_refresh")).toBeNull();
      expect(localStorage.getItem("moistello_access_token")).toBeNull();
    });

    it("should only persist user profile (non-sensitive)", async () => {
      const store = useAuthStore.getState();

      const mockUser = {
        id: "user-123",
        walletAddress: "GACCOUNT123",
        displayName: "Test User",
        email: "test@example.com",
      };

      await store.setTokens("access-token", "refresh-token", mockUser);

      // Check localStorage - should only have encrypted user data
      const allKeys = Object.keys(localStorage);
      const userKey = allKeys.find((k) => k.includes("user"));

      expect(userKey).toBe("moistello_user");

      // User data should be encrypted (has ciphertext, iv, salt)
      const userData = localStorage.getItem("moistello_user");
      expect(userData).not.toBeNull();

      const parsed = JSON.parse(userData!);
      // Should be encrypted payload OR legacy HMAC format
      const isEncrypted =
        parsed.ciphertext && parsed.iv && parsed.salt && parsed.version === 1;
      const isLegacyHMAC = parsed.user && parsed.hmac;

      expect(isEncrypted || isLegacyHMAC).toBe(true);

      // But definitely no raw tokens
      expect(parsed.token).toBeUndefined();
      expect(parsed.accessToken).toBeUndefined();
      expect(parsed.refreshToken).toBeUndefined();
    });
  });

  describe("XSS Attack Simulation", () => {
    it("should not expose tokens via localStorage enumeration", async () => {
      const authStore = useAuthStore.getState();

      const mockUser = {
        id: "user-123",
        walletAddress: "GACCOUNT123",
        displayName: "Victim",
      };

      await authStore.setTokens(
        "secret-access-token",
        "secret-refresh-token",
        mockUser,
      );

      // Simulate attacker script enumerating localStorage
      const exfiltrated: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          exfiltrated[key] = localStorage.getItem(key)!;
        }
      }

      // Verify no tokens in exfiltrated data
      const allValues = Object.values(exfiltrated).join(" ");
      expect(allValues).not.toContain("secret-access-token");
      expect(allValues).not.toContain("secret-refresh-token");
      expect(allValues).not.toContain("Bearer");
      expect(allValues).not.toContain("jwt");
    });

    it("should not expose nonce/signature via localStorage after auth", () => {
      const flowStore = useAuthFlowStore.getState();

      flowStore.signSuccess(
        "attacker-wants-this-signature",
        "attacker-wants-this-nonce",
      );

      // Simulate attacker reading localStorage
      const allData = JSON.stringify(localStorage);

      expect(allData).not.toContain("attacker-wants-this-signature");
      expect(allData).not.toContain("attacker-wants-this-nonce");
    });
  });
});
