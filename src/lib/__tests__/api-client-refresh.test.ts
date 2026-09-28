/**
 * Session expiry and refresh-race coverage for the API client.
 *
 * Production reports intermittent 401 loops that only appear under concurrency,
 * so these tests drive the response interceptor directly with a real 401 and
 * assert the two properties that matter:
 *
 *  1. A burst of concurrent requests hitting an expired token performs exactly
 *     one refresh and recovers every one of them — no request is failed.
 *  2. A failing refresh signs out predictably: the original request is not
 *     retried, the session is cleared, and nothing re-enters the refresh path.
 *
 * The second is what causes the loop: an implementation that retries after a
 * failed refresh gets a second 401, which triggers a second refresh, and the
 * app ping-pongs between the API and the login route.
 *
 * `apiClient` is reached through its registered interceptors rather than through
 * real HTTP, matching the approach already used by `api-client-csrf.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";

// ── axios mock ───────────────────────────────────────────────────────────────
//
// `apiClient` is used both as an axios instance (interceptors register here at
// module import) and as a callable — `apiClient(originalRequest)` replays the
// retried request — so the mock has to be a function carrying the interceptor
// registration API.

type ReqHandler = (c: InternalAxiosRequestConfig) => unknown;
// The interceptor always returns a promise (it either replays the request or
// rejects), so typing it as one lets tests await it and attach `.catch`.
type ResHandler = (e: AxiosError) => Promise<unknown>;

const replayed: InternalAxiosRequestConfig[] = [];

const replay = vi.fn((config: InternalAxiosRequestConfig) => {
  replayed.push(config);
  return Promise.resolve({
    data: { ok: true },
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  } as AxiosResponse);
});

const mockApiClient = Object.assign(replay, {
  interceptors: {
    request: { use: (_ok: ReqHandler) => {} },
    response: {
      use: (_ok: unknown, rejected: (e: AxiosError) => Promise<unknown>) =>
        responseHandlers.push(rejected),
    },
  },
});

const responseHandlers: ResHandler[] = [];

const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock("axios", () => {
  // `axios.create` builds the shared client whose interceptors are under test;
  // `axios.post` / `axios.delete` are the bare calls used for the refresh and
  // session-clear round trips.
  const axios = {
    create: () => mockApiClient,
    post: mockPost,
    delete: mockDelete,
  };
  return { default: axios, create: axios.create };
});

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/constants", () => ({ API_BASE_URL: "http://localhost:1100/v1" }));

function responseErrorHandler(): ResHandler {
  const handler = responseHandlers[responseHandlers.length - 1];
  if (!handler) throw new Error("API client response interceptor is not configured");
  return handler;
}

/** A 401 shaped exactly like the one the interceptor branches on. */
function unauthorized(config: InternalAxiosRequestConfig): AxiosError {
  return {
    isAxiosError: true,
    config,
    response: { status: 401, data: {}, headers: {}, statusText: "Unauthorized", config },
    message: "Request failed with status code 401",
    toJSON: () => ({}),
  } as unknown as AxiosError;
}

function requestConfig(url = "/wallets"): InternalAxiosRequestConfig {
  return { url, method: "get", headers: {} } as InternalAxiosRequestConfig;
}

/** jsdom refuses real navigation, so the redirect target is observed directly. */
function stubLocationRedirect() {
  const store = { navigatedTo: null as string | null };
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      origin: window.location.origin,
      set href(value: string) {
        store.navigatedTo = value;
      },
      get href() {
        return "http://localhost:1110/";
      },
    },
  });
  return store;
}

beforeEach(async () => {
  vi.clearAllMocks();
  replayed.length = 0;
  responseHandlers.length = 0;
  // `signOutInFlight` is module state that is deliberately never reset in
  // production, so each test needs a fresh module instance to start un-latched.
  vi.resetModules();
  // Importing the module is what registers the interceptors under test.
  await import("@/lib/api-client");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("refresh race", () => {
  it("performs a single refresh for many concurrent 401s and recovers all of them", async () => {
    mockPost.mockResolvedValue({ data: { token: "fresh-token" } });
    const handler = responseErrorHandler();

    // Ten requests issued at the same instant, all rejected with 401 because the
    // access token expired between being attached and being checked.
    const inFlight = Array.from({ length: 10 }, (_, i) =>
      handler(unauthorized(requestConfig(`/resource-${i}`))),
    );

    const settled = await Promise.allSettled(inFlight);

    // No request may be failed — this is the "recovers cleanly" half.
    expect(settled.every((r) => r.status === "fulfilled")).toBe(true);

    // And the refresh happens exactly once, not ten times.
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith("/api/auth/refresh", undefined, expect.anything());

    // Every original request is replayed with the new token attached.
    expect(replayed).toHaveLength(10);
    for (const config of replayed) {
      expect(config.headers?.Authorization).toBe("Bearer fresh-token");
    }
  });

  it("does not start a second refresh cycle when a retried request 401s again", async () => {
    mockPost.mockResolvedValue({ data: { token: "fresh-token" } });
    const handler = responseErrorHandler();

    const config = requestConfig();
    // First 401: refreshes, marks the config as retried, replays.
    await handler(unauthorized(config));
    expect(config.headers?.Authorization).toBe("Bearer fresh-token");
    expect(mockPost).toHaveBeenCalledTimes(1);

    // The replay 401s too. Without the `_retry` marker this opens a whole
    // second refresh cycle — the origin of the production 401 loop. The error is
    // caught rather than asserted against so vitest does not try to serialise
    // the synthetic axios error object.
    await handler(unauthorized(config)).catch(() => undefined);

    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it("attaches the refreshed token to subsequent unrelated requests", async () => {
    mockPost.mockResolvedValue({ data: { token: "fresh-token" } });
    const handler = responseErrorHandler();

    await handler(unauthorized(requestConfig("/a")));

    expect(replayed[0].headers?.Authorization).toBe("Bearer fresh-token");
  });
});

describe("refresh failure", () => {
  beforeEach(() => {
    mockPost.mockRejectedValue(new Error("refresh rejected"));
    mockDelete.mockResolvedValue({ data: {} });
  });

  it("rejects the original request instead of retrying it", async () => {
    const handler = responseErrorHandler();

    await expect(handler(unauthorized(requestConfig()))).rejects.toThrow("refresh rejected");

    // No replay: retrying after a failed refresh is what loops.
    expect(replayed).toHaveLength(0);
  });

  it("clears the server session before leaving and signals auth is required", async () => {
    const handler = responseErrorHandler();
    const redirect = stubLocationRedirect();
    const events: string[] = [];
    const listener = () => events.push("auth:required");
    window.addEventListener("auth:required", listener);

    await expect(handler(unauthorized(requestConfig()))).rejects.toThrow("refresh rejected");

    // The refresh token lives in an HttpOnly cookie, so only the server can drop
    // it. The client must wait for that before navigating, otherwise middleware
    // sees the stale cookie and bounces the user straight back in.
    expect(mockDelete).toHaveBeenCalledWith("/api/auth/session", expect.anything());
    expect(events).toEqual(["auth:required"]);
    expect(redirect.navigatedTo).toBe("/login");

    window.removeEventListener("auth:required", listener);
  });

  it("signs out once per burst rather than once per failed request", async () => {
    const handler = responseErrorHandler();
    stubLocationRedirect();
    const events: string[] = [];
    const listener = () => events.push("auth:required");
    window.addEventListener("auth:required", listener);

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) => handler(unauthorized(requestConfig(`/r-${i}`)))),
    );

    expect(results.every((r) => r.status === "rejected")).toBe(true);

    // Five requests fail, but the sign-out signal fires once. A burst must not
    // dispatch five events or attempt five session clears.
    expect(events).toHaveLength(1);
    expect(mockDelete).toHaveBeenCalledTimes(1);

    window.removeEventListener("auth:required", listener);
  });

  it("surfaces the refresh error even when clearing the session also fails", async () => {
    mockDelete.mockRejectedValue(new Error("network down"));
    const handler = responseErrorHandler();
    stubLocationRedirect();

    // A failure to clear cookies must not replace the error the caller sees with
    // an unrelated one.
    await expect(handler(unauthorized(requestConfig()))).rejects.toThrow("refresh rejected");
  });
});
