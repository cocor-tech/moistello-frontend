"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { ApiResponse, User } from "@/types";
import { post } from "@/lib/api-client";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth/token-store";
import { computeHmacSha256 } from "@/lib/wallet/hmac";

const isDev = process.env.NODE_ENV === "development"

// ── Token storage ──
//
// Tokens are never written to localStorage. The access token lives in memory
// for the life of the tab (see @/lib/auth/token-store) and both tokens are
// persisted only as HttpOnly cookies, written by /api/auth/session. Script on
// the page — including anything injected through an XSS — can neither read
// those cookies nor find a token sitting in storage after a reload.
//
// The user profile below is a different matter: it is a display cache, not a
// credential, and it stays in localStorage under an HMAC so tampering is
// detected.

const USER_DATA_KEY = "moistello_user";

interface UserStoreWithHmac {
  user: User;
  hmac: string;
}

/** POST the token pair to the server so it can write the HttpOnly cookies. */
async function persistSession(token: string, refreshToken: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, refreshToken }),
    });
  } catch (e) {
    console.warn("[auth] Failed to persist session cookie:", e);
  }
}

/**
 * Recover the access token after a page load.
 *
 * The cookie is HttpOnly, so this same-origin round trip is the only way back
 * to the token — and it hands back the access token alone. The refresh token
 * stays on the server, which is what stops a stolen access token from being
 * parlayed into an indefinite session.
 */
async function rehydrateAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch("/api/auth/session");
    if (!response.ok) return null;

    const data = await response.json();
    if (typeof data?.token !== "string" || !data.token) return null;

    setAccessToken(data.token);
    return data.token;
  } catch (e) {
    console.warn("[auth] Failed to restore session:", e);
    return null;
  }
}

/** Ask the server to drop the HttpOnly cookies. */
async function clearSession(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } catch (e) {
    console.warn("[auth] Failed to clear session cookie:", e);
  }
}

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_DATA_KEY);
    if (!raw) return null;

    const store: UserStoreWithHmac = JSON.parse(raw);
    if (!store.hmac || !store.user) return null;

    const expectedHMAC = computeHmacSha256(JSON.stringify(store.user));
    if (store.hmac !== expectedHMAC) {
      console.warn("[auth] HMAC mismatch — user data may be tampered");
      localStorage.removeItem(USER_DATA_KEY);
      return null;
    }

    return store.user;
  } catch { return null }
}

function setStoredUser(user: User): void {
  if (typeof window === "undefined") return;
  try {
    const hmac = computeHmacSha256(JSON.stringify(user));
    const store: UserStoreWithHmac = { user, hmac };
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(store));
  } catch (e) { console.warn("[auth] Failed to persist user data:", e) }
}

function removeStoredUser(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(USER_DATA_KEY) } catch (e) { console.warn("[auth] Failed to remove user data:", e) }
}

/**
 * Every localStorage key that has ever held a token in this app.
 *
 * Earlier builds persisted tokens here. A browser upgrading to this version
 * still has those values sitting in storage, so they are deleted on load —
 * otherwise the very credential this change removes from script's reach would
 * remain readable for as long as the entry survives.
 */
const LEGACY_TOKEN_KEYS = [
  "moistello_token",
  "moistello_refresh",
  "moistello_access_token",
  "moistello_refresh_token",
] as const;

function purgeLegacyTokenStorage(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
  } catch (e) { console.warn("[auth] Failed to purge legacy token storage:", e) }
}

purgeLegacyTokenStorage();

function extractTokenExpiry(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch { return null }
}

interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  /** Mirrors the in-memory access token so components can react to sign-in. */
  token: string | null;
  isLoading: boolean;
  tokenExpiresAt: number | null;
}

interface AuthActions {
  login: (walletAddress: string, signature: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  /**
   * Hands a freshly issued token pair to the server for storage. Awaiting the
   * returned promise matters before any navigation: the middleware gates
   * protected routes on the session cookie, which does not exist until this
   * resolves.
   */
  setTokens: (accessToken: string, refreshToken: string, user?: User) => Promise<void>;
  /** Refreshes the cached profile without touching the session. */
  updateUser: (user: User) => void;
  clearTokens: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

const baseStore = (set: any, get: any): AuthStore => ({
  // Nothing is known until checkAuth() has asked the server whether the
  // HttpOnly session cookie is still good — there is no token in storage to
  // seed this from any more.
  isAuthenticated: false,
  user: getStoredUser(),
  token: null,
  isLoading: true,
  tokenExpiresAt: null,

  login: async (walletAddress: string, signature: string) => {
    set({ isLoading: true });
    try {
      const response = await post<ApiResponse<LoginResponse>>("/auth/login", {
        walletAddress,
        signature,
      });

      const data = response.data ?? (response as unknown as LoginResponse);

      if (!data.token || !data.user) {
        throw new Error(response.error || "Authentication failed");
      }

      const { token, refreshToken, user } = data;
      const exp = extractTokenExpiry(token);

      setAccessToken(token);
      setStoredUser(user);
      await persistSession(token, refreshToken);

      set({
        isAuthenticated: true,
        user,
        token,
        tokenExpiresAt: exp ?? Date.now() + 15 * 60 * 1000,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    post("/auth/logout").catch(() => {})
    get().clearTokens()
    set({
      isAuthenticated: false,
      user: null,
      token: null,
      tokenExpiresAt: null,
      isLoading: false,
    })
    if (typeof window !== "undefined") {
      import("@/lib/wallet/registry").then(({ getWalletRegistry }) => {
        try { getWalletRegistry().getAdapter("passkey")?.reset?.() } catch (e) { console.warn("[auth] Failed to reset passkey adapter:", e) }
      })
    }
  },

  checkAuth: async () => {
    // A reload wipes the in-memory token, so the session has to be recovered
    // from the HttpOnly cookie the only way script can: by asking the server.
    let token = getAccessToken();
    if (!token) {
      token = await rehydrateAccessToken();
    }

    if (!token) {
      set({ isAuthenticated: false, user: null, token: null, isLoading: false });
      return;
    }

    const exp = extractTokenExpiry(token);
    if (exp && Date.now() < exp) {
      set({ isLoading: false, isAuthenticated: true, token, tokenExpiresAt: exp, user: getStoredUser() });
      return;
    }

    set({ isLoading: true });
    try {
      const response = await post<ApiResponse<{ user: User }>>("/auth/me");
      const data = response.data;
      if (!data?.user) throw new Error("Invalid session");

      // The interceptor may have swapped in a fresh token behind this call.
      const currentToken = getAccessToken() ?? token;
      const updatedExp = extractTokenExpiry(currentToken);

      setStoredUser(data.user);

      set({
        isAuthenticated: true,
        user: data.user,
        token: currentToken,
        tokenExpiresAt: updatedExp ?? Date.now() + 15 * 60 * 1000,
        isLoading: false,
      });
    } catch (e) {
      console.warn("[auth] Token refresh failed, logging out:", e)
      get().logout();
    }
  },

  setTokens: async (accessToken: string, refreshToken: string, user?: User) => {
    setAccessToken(accessToken);
    const exp = extractTokenExpiry(accessToken);
    if (user) setStoredUser(user);

    set({
      token: accessToken,
      tokenExpiresAt: exp ?? Date.now() + 15 * 60 * 1000,
      isAuthenticated: true,
      user: user ?? getStoredUser(),
    });

    await persistSession(accessToken, refreshToken);
  },

  updateUser: (user: User) => {
    setStoredUser(user);
    set({ user });
  },

  clearTokens: async () => {
    clearAccessToken();
    removeStoredUser();
    purgeLegacyTokenStorage();
    set({ token: null, tokenExpiresAt: null });
    await clearSession();
  },
});

export const useAuthStore = create<AuthStore>()(
  isDev ? devtools(baseStore) : baseStore
)