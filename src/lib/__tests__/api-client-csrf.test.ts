import { afterEach, describe, expect, it } from "vitest";
import type { InternalAxiosRequestConfig } from "axios";
import { apiClient } from "@/lib/api-client";

function requestHandler() {
  const handler = (apiClient.interceptors.request.handlers ?? [])
    .find((entry) => entry.fulfilled)?.fulfilled;
  if (!handler) throw new Error("Axios request interceptor is not configured");
  return handler;
}

function config(baseURL: string, url: string): InternalAxiosRequestConfig {
  return {
    baseURL,
    url,
    method: "post",
    headers: {},
  } as InternalAxiosRequestConfig;
}

afterEach(() => {
  document.cookie = "moistello_csrf=; Max-Age=0; path=/";
});

describe("API client CSRF scoping", () => {
  it("does not send the app token to the external API origin", async () => {
    document.cookie = "moistello_csrf=app-token; path=/";
    const result = await requestHandler()(config("http://localhost:1100/v1", "/auth/refresh"));

    expect(result.headers["X-CSRF-Token"]).toBeUndefined();
  });

  it("sends the current token to same-origin API routes", async () => {
    document.cookie = "moistello_csrf=app-token; path=/";
    const result = await requestHandler()(config(window.location.origin, "/api/auth/refresh"));

    expect(result.headers["X-CSRF-Token"]).toBe("app-token");
  });
});
