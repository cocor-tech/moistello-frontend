"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { ApiResponse, User } from "@/types";
import { post } from "@/lib/api-client";
import { computeHmacSha256 } from "@/lib/wallet/hmac";

const isDev = process.env.NODE_ENV === "development"

// ── Single source of truth for token storage ──

const ACCESS_TOKEN_KEY = "moistello_token";
const REFRESH_TOKEN_KEY = "moistello_refresh";
const USER_DATA_KEY = "moistello_user";

interface UserStoreWithHmac {
  user: User;
  hmac: string;
}

function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(ACCESS_TOKEN_KEY) } catch { return null }
}

function setStoredAccessToken(value: string): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(ACCESS_TOKEN_KEY, value) } catch (e) { console.warn("[auth] Failed to persist access token:", e) }
}

function removeStoredAccessToken(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(ACCESS_TOKEN_KEY) } catch (e) { console.warn("[auth] Failed to remove access token:", e) }
}

function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(REFRESH_TOKEN_KEY) } catch { return null }
}

function setStoredRefreshToken(value: string): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(REFRESH_TOKEN_KEY, value) } catch (e) { console.warn("[auth] Failed to persist refresh token:", e) }
}

function removeStoredRefreshToken(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(REFRESH_TOKEN_KEY) } catch (e) { console.warn("[auth] Failed to remove refresh token:", e) }
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

// Migrate legacy keys if they exist
function migrateLegacyTokens(): void {
  if (typeof window === "undefined") return;
  const oldAccess = localStorage.getItem("moistello_access_token");
  const oldRefresh = localStorage.getItem("moistello_refresh_token");
  const newAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
  const newRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (oldAccess && !newAccess) setStoredAccessToken(oldAccess);
  if (oldRefresh && !newRefresh) setStoredRefreshToken(oldRefresh);

  try {
    if (oldAccess) localStorage.removeItem("moistello_access_token");
    if (oldRefresh) localStorage.removeItem("moistello_refresh_token");
  } catch (e) { console.warn("[auth] Failed to migrate legacy tokens:", e) }
}

migrateLegacyTokens();

function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function removeCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

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
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  tokenExpiresAt: number | null;
}

interface AuthActions {
  login: (walletAddress: string, signature: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string, user?: User) => void;
  clearTokens: () => void;
}

type AuthStore = AuthState & AuthActions;

const baseStore = (set: any, get: any): AuthStore => ({
  isAuthenticated: !!getStoredAccessToken(),
  user: getStoredUser(),
  token: getStoredAccessToken(),
  refreshToken: getStoredRefreshToken(),
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

      setStoredAccessToken(token);
      setStoredRefreshToken(refreshToken);
      setStoredUser(user);
      setCookie("moistello_token", token, 86400);

      set({
        isAuthenticated: true,
        user,
        token,
        refreshToken,
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
      refreshToken: null,
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
    const token = getStoredAccessToken();
    if (!token) {
      set({ isAuthenticated: false, user: null, token: null, refreshToken: null, isLoading: false });
      return;
    }

    const exp = extractTokenExpiry(token);
    if (exp && Date.now() < exp) {
      set({ isLoading: false, isAuthenticated: true, token, refreshToken: getStoredRefreshToken(), tokenExpiresAt: exp, user: getStoredUser() });
      return;
    }

    set({ isLoading: true });
    try {
      const response = await post<ApiResponse<{ user: User }>>("/auth/me");
      const data = response.data;
      if (!data?.user) throw new Error("Invalid session");

      const refreshToken = getStoredRefreshToken();
      const updatedExp = extractTokenExpiry(token);

      setStoredUser(data.user);

      set({
        isAuthenticated: true,
        user: data.user,
        token,
        refreshToken,
        tokenExpiresAt: updatedExp ?? Date.now() + 15 * 60 * 1000,
        isLoading: false,
      });
    } catch (e) {
      console.warn("[auth] Token refresh failed, logging out:", e)
      get().logout();
    }
  },

  setTokens: (accessToken: string, refreshToken: string, user?: User) => {
    setStoredAccessToken(accessToken);
    setStoredRefreshToken(refreshToken);
    setCookie("moistello_token", accessToken, 86400);
    const exp = extractTokenExpiry(accessToken);
    if (user) setStoredUser(user);
    set({
      token: accessToken,
      refreshToken,
      tokenExpiresAt: exp ?? Date.now() + 15 * 60 * 1000,
      isAuthenticated: true,
      user: user ?? getStoredUser(),
    });
  },

  clearTokens: () => {
    removeStoredAccessToken();
    removeStoredRefreshToken();
    removeStoredUser();
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("moistello_access_token");
        localStorage.removeItem("moistello_refresh_token");
      } catch (e) { console.warn("[auth] Failed to remove legacy tokens:", e) }
    }
    removeCookie("moistello_token");
    removeCookie("moistello_refresh");
    set({ token: null, refreshToken: null, tokenExpiresAt: null });
  },
});

export const useAuthStore = create<AuthStore>()(
  isDev ? devtools(baseStore) : baseStore
)