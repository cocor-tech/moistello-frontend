import { describe, it, expect, vi } from "vitest";
import {
  createRateLimitAwareRetry,
  createRetryDelayResolver,
  createRetryPredicate,
  getStatusCode,
  parseRetryAfterMs,
  resolveRetryDelayMs,
  RETRY_MAX_DELAY_MS,
  RETRY_MIN_DELAY_MS,
  RATE_LIMIT_MAX_RETRIES,
} from "../query-retry";

/** Builds an axios-shaped 429 error, optionally with a Retry-After header. */
function rateLimitError(retryAfter?: string) {
  return {
    response: {
      status: 429,
      headers: retryAfter === undefined ? {} : { "retry-after": retryAfter },
    },
  };
}

function otherError(status = 500) {
  return { response: { status, headers: {} } };
}

describe("parseRetryAfterMs", () => {
  it("parses delta-seconds", () => {
    expect(parseRetryAfterMs(rateLimitError("30"))).toBe(30_000);
  });

  it("parses an HTTP-date relative to now", () => {
    const now = Date.parse("2024-01-01T00:00:00Z");
    const header = new Date(now + 45_000).toUTCString();
    expect(parseRetryAfterMs(rateLimitError(header), now)).toBe(45_000);
  });

  it("returns 0 for an HTTP-date already in the past", () => {
    const now = Date.parse("2024-01-01T00:00:00Z");
    const header = new Date(now - 60_000).toUTCString();
    expect(parseRetryAfterMs(rateLimitError(header), now)).toBe(0);
  });

  it("reads headers exposed through an AxiosHeaders-style .get()", () => {
    const error = {
      response: {
        status: 429,
        headers: { get: (name: string) => (name === "retry-after" ? "12" : null) },
      },
    };
    expect(parseRetryAfterMs(error)).toBe(12_000);
  });

  it("returns null when the header is missing or unparseable", () => {
    expect(parseRetryAfterMs(rateLimitError())).toBeNull();
    expect(parseRetryAfterMs(rateLimitError("soon"))).toBeNull();
  });
});

describe("resolveRetryDelayMs", () => {
  it("ignores non-429 errors so normal retry behaviour is preserved", () => {
    expect(resolveRetryDelayMs(otherError(500), 1)).toBeNull();
    expect(resolveRetryDelayMs(otherError(404), 1)).toBeNull();
  });

  it("honours Retry-After to within 1s accuracy", () => {
    for (const seconds of [1, 5, 30, 120]) {
      // No jitter is applied on the Retry-After path, so the delay is exact.
      const delay = resolveRetryDelayMs(
        rateLimitError(String(seconds)),
        1,
        {},
        () => 0.5,
      );
      expect(Math.abs(delay! - seconds * 1_000)).toBeLessThanOrEqual(1_000);
    }
  });

  it("honours Retry-After regardless of jitter input", () => {
    // Jitter is deliberately skipped on this path so the server instruction
    // stays accurate to the second.
    for (const jitterInput of [0, 0.5, 1]) {
      const delay = resolveRetryDelayMs(
        rateLimitError("30"),
        1,
        {},
        () => jitterInput,
      );
      expect(delay).toBe(30_000);
    }
  });

  it("uses Retry-After even on later attempts, overriding the exponential term", () => {
    const delay = resolveRetryDelayMs(
      rateLimitError("2"),
      5,
      {},
      () => 0.5,
    );
    expect(delay).toBe(2_000);
  });

  it("falls back to exponential backoff when Retry-After is absent", () => {
    const delays = [1, 2, 3, 4].map((attempt) =>
      resolveRetryDelayMs(rateLimitError(), attempt, {}, () => 0.5),
    );
    expect(delays).toEqual([1_000, 2_000, 4_000, 8_000]);
  });

  it("never exceeds the cap under sustained 429s", () => {
    for (let attempt = 1; attempt <= 12; attempt++) {
      const delay = resolveRetryDelayMs(rateLimitError(), attempt, {}, () => 1);
      expect(delay).toBeLessThanOrEqual(RETRY_MAX_DELAY_MS);
    }
  });

  it("honours a Retry-After beyond the cap instead of retrying too early", () => {
    // Clamping a long Retry-After down to the cap would re-fire the request
    // before the server said it was ready, deepening the throttling.
    const delay = resolveRetryDelayMs(rateLimitError("120"), 1, {}, () => 0);
    expect(delay).toBe(120_000);
    const huge = resolveRetryDelayMs(rateLimitError("3600"), 1, {}, () => 0);
    expect(huge).toBe(3_600_000);
  });

  it("never retries faster than the floor, even for Retry-After: 0", () => {
    const delay = resolveRetryDelayMs(rateLimitError("0"), 1, {}, () => 0.5);
    expect(delay).toBe(RETRY_MIN_DELAY_MS);
  });

  it("spreads retries with jitter and never exceeds the cap", () => {
    const low = resolveRetryDelayMs(rateLimitError(), 3, {}, () => 0);
    const high = resolveRetryDelayMs(rateLimitError(), 3, {}, () => 1);
    expect(low).toBeLessThan(4_000);
    expect(high).toBeGreaterThan(4_000);
    expect(high).toBeLessThanOrEqual(RETRY_MAX_DELAY_MS);
  });
});

describe("createRateLimitAwareRetry", () => {
  it("does not retry immediately on a 429 (the retry-storm regression)", () => {
    const retry = createRateLimitAwareRetry({ jitterRatio: 0 });
    // The old policy was `retry: 1`, which re-fired instantly and deepened the
    // throttling. The very first delay must be a real wait.
    expect(retry(0, rateLimitError())).toBe(1_000);
  });

  it("backs off further on each successive 429", () => {
    const retry = createRateLimitAwareRetry({ jitterRatio: 0 });
    const delays: number[] = [0, 1, 2, 3, 4].map((failureCount) => {
      const resolved = retry(failureCount, rateLimitError());
      if (typeof resolved !== "number") {
        throw new Error(
          `expected a delay on attempt ${failureCount}, got ${String(resolved)}`,
        );
      }
      return resolved;
    });
    expect(delays).toEqual([1_000, 2_000, 4_000, 8_000, 16_000]);
    // Strictly increasing => total wait grows, it does not hammer the API.
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]!);
    }
  });

  it("stops after the retry budget instead of retrying forever", () => {
    const retry = createRateLimitAwareRetry({ jitterRatio: 0 });
    for (let failureCount = 0; failureCount <= RATE_LIMIT_MAX_RETRIES; failureCount++) {
      expect(retry(failureCount, rateLimitError())).not.toBe(false);
    }
    expect(retry(RATE_LIMIT_MAX_RETRIES + 1, rateLimitError())).toBe(false);
    // Even sustained throttling must terminate, not spin.
    expect(retry(RATE_LIMIT_MAX_RETRIES + 10, rateLimitError())).toBe(false);
  });

  it("keeps the previous single retry for non-429 errors", () => {
    const retry = createRateLimitAwareRetry();
    expect(retry(0, otherError(500))).toBe(true);
    expect(retry(1, otherError(500))).toBe(false);
  });

  it("resets the backoff once the server stops rate limiting", () => {
    const retry = createRateLimitAwareRetry({ jitterRatio: 0 });
    // A success between failures means failureCount restarts at 0, so the
    // delay does not stay pinned at the cap.
    expect(retry(0, rateLimitError())).toBe(1_000);
  });
});

describe("getStatusCode", () => {
  it("reads the status from axios and fetch style errors", () => {
    expect(getStatusCode({ response: { status: 429 } })).toBe(429);
    expect(getStatusCode({ status: 429 })).toBe(429);
    expect(getStatusCode(new Error("boom"))).toBeUndefined();
    expect(getStatusCode(null)).toBeUndefined();
  });
});

describe("TanStack Query v5 adapters", () => {
  it("retry predicate answers boolean and matches the combined policy", () => {
    const retry = createRateLimitAwareRetry({ jitterRatio: 0 });
    const shouldRetry = createRetryPredicate({ jitterRatio: 0 });
    const error = rateLimitError();
    for (let failureCount = 0; failureCount <= RATE_LIMIT_MAX_RETRIES; failureCount++) {
      expect(shouldRetry(failureCount, error)).toBe(retry(failureCount, error) !== false);
      expect(typeof shouldRetry(failureCount, error)).toBe("boolean");
    }
    expect(shouldRetry(RATE_LIMIT_MAX_RETRIES + 1, error)).toBe(false);
  });

  it("retry delay answers number and matches the combined policy", () => {
    const retry = createRateLimitAwareRetry({ jitterRatio: 0 });
    const retryDelay = createRetryDelayResolver({ jitterRatio: 0 });
    const error = rateLimitError();
    for (let failureCount = 0; failureCount <= RATE_LIMIT_MAX_RETRIES; failureCount++) {
      expect(retryDelay(failureCount, error)).toBe(retry(failureCount, error));
    }
  });

  it("honours Retry-After through the v5 retryDelay channel", () => {
    const retryDelay = createRetryDelayResolver();
    expect(retryDelay(0, rateLimitError("30"))).toBe(30_000);
  });

  it("backs off exponentially through the v5 retryDelay channel", () => {
    const retryDelay = createRetryDelayResolver({ jitterRatio: 0 });
    const delays = [0, 1, 2, 3].map((failureCount) =>
      retryDelay(failureCount, rateLimitError()),
    );
    expect(delays).toEqual([1_000, 2_000, 4_000, 8_000]);
  });

  it("never reports an immediate retry through the v5 retryDelay channel", () => {
    const retryDelay = createRetryDelayResolver({ jitterRatio: 0 });
    // Even once the budget is spent and no delay is ever consumed, the value
    // must not be 0 — that would be an instant re-fire of a throttled request.
    expect(retryDelay(RATE_LIMIT_MAX_RETRIES + 1, rateLimitError())).toBe(
      RETRY_MIN_DELAY_MS,
    );
  });

  it("keeps the single retry for non-429 errors through both v5 channels", () => {
    const shouldRetry = createRetryPredicate();
    const retryDelay = createRetryDelayResolver({ jitterRatio: 0 });
    expect(shouldRetry(0, otherError(500))).toBe(true);
    expect(shouldRetry(1, otherError(500))).toBe(false);
    expect(retryDelay(0, otherError(500))).toBe(RETRY_MIN_DELAY_MS);
  });
});

