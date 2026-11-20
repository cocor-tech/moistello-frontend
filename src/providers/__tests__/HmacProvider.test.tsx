import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HmacProvider, useHmac } from "../HmacProvider";
import { ensureHmacKey, clearHmacKeyCache } from "../../lib/wallet/hmac";

vi.mock("../../lib/wallet/hmac", () => ({
  ensureHmacKey: vi.fn(),
  clearHmacKeyCache: vi.fn(),
}));

function Consumer() {
  const { key, ready, refresh, invalidate } = useHmac();

  return (
    <div>
      <span data-testid="ready">{String(ready)}</span>
      <span data-testid="key">{key ? Array.from(key).join(",") : "null"}</span>
      <button onClick={() => void refresh()} data-testid="refresh-btn">
        Refresh
      </button>
      <button onClick={() => invalidate()} data-testid="invalidate-btn">
        Invalidate
      </button>
    </div>
  );
}

describe("HmacProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children, initializes HMAC key on mount, and marks ready", async () => {
    const dummyKey = new Uint8Array([1, 2, 3, 4]);
    vi.mocked(ensureHmacKey).mockResolvedValueOnce(dummyKey);

    render(
      <HmacProvider>
        <Consumer />
      </HmacProvider>
    );

    // Initial state before resolution
    expect(screen.getByTestId("ready").textContent).toBe("false");
    expect(screen.getByTestId("key").textContent).toBe("null");

    // Wait for effect to resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(ensureHmacKey).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("ready").textContent).toBe("true");
    expect(screen.getByTestId("key").textContent).toBe("1,2,3,4");
  });

  it("refreshes key when refresh() is invoked", async () => {
    const user = userEvent.setup();
    const initialKey = new Uint8Array([1, 2, 3]);
    const refreshedKey = new Uint8Array([5, 6, 7]);
    vi.mocked(ensureHmacKey)
      .mockResolvedValueOnce(initialKey)
      .mockResolvedValueOnce(refreshedKey);

    render(
      <HmacProvider>
        <Consumer />
      </HmacProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("key").textContent).toBe("1,2,3");

    await user.click(screen.getByTestId("refresh-btn"));

    expect(clearHmacKeyCache).toHaveBeenCalledTimes(1);
    expect(ensureHmacKey).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("key").textContent).toBe("5,6,7");
    expect(screen.getByTestId("ready").textContent).toBe("true");
  });

  it("invalidates key and resets ready state when invalidate() is called", async () => {
    const user = userEvent.setup();
    const dummyKey = new Uint8Array([9, 8, 7]);
    vi.mocked(ensureHmacKey).mockResolvedValueOnce(dummyKey);

    render(
      <HmacProvider>
        <Consumer />
      </HmacProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("ready").textContent).toBe("true");
    expect(screen.getByTestId("key").textContent).toBe("9,8,7");

    await user.click(screen.getByTestId("invalidate-btn"));

    expect(clearHmacKeyCache).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("ready").textContent).toBe("false");
    expect(screen.getByTestId("key").textContent).toBe("null");
  });

  it("handles failure when ensureHmacKey resolves to null", async () => {
    vi.mocked(ensureHmacKey).mockResolvedValueOnce(null);

    render(
      <HmacProvider>
        <Consumer />
      </HmacProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(ensureHmacKey).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("ready").textContent).toBe("true");
    expect(screen.getByTestId("key").textContent).toBe("null");
  });

  it("does not update state if component unmounts before key fetch finishes", async () => {
    let resolveKey!: (val: Uint8Array | null) => void;
    const pendingPromise = new Promise<Uint8Array | null>((resolve) => {
      resolveKey = resolve;
    });
    vi.mocked(ensureHmacKey).mockReturnValueOnce(pendingPromise);

    const { unmount } = render(
      <HmacProvider>
        <Consumer />
      </HmacProvider>
    );

    unmount();

    await act(async () => {
      resolveKey(new Uint8Array([10, 20, 30]));
      await Promise.resolve();
    });

    expect(ensureHmacKey).toHaveBeenCalledTimes(1);
  });

  it("returns default context values when useHmac is used outside provider", async () => {
    render(<Consumer />);

    expect(screen.getByTestId("ready").textContent).toBe("false");
    expect(screen.getByTestId("key").textContent).toBe("null");

    const user = userEvent.setup();
    await user.click(screen.getByTestId("refresh-btn"));
    await user.click(screen.getByTestId("invalidate-btn"));

    expect(clearHmacKeyCache).not.toHaveBeenCalled();
  });
});
