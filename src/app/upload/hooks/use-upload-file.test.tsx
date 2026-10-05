import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUploadFile } from "../hooks/use-upload-file";
import { isValidIdempotencyKey } from "../utils/upload-idempotency";
import { UploadError, type TransferResult } from "../utils/upload-transport";

// The transport is the network boundary; the phase machine is what we assert.
vi.mock("../utils/upload-transport", async () => {
  const actual = await vi.importActual<typeof import("../utils/upload-transport")>(
    "../utils/upload-transport",
  );
  return {
    ...actual,
    transferFile: vi.fn(),
    finalizeUpload: vi.fn(),
    cancelStagedUpload: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/auth/csrf", () => ({
  getCsrfHeaders: () => ({ "x-csrf-token": "test" }),
}));

const { transferFile: transferFileMock, finalizeUpload: finalizeUploadMock } =
  vi.mocked(await import("../utils/upload-transport"));

/** A staged record, as the transport resolves it on a first successful transfer. */
function staged(uploadId: string, slug = "about"): TransferResult {
  return {
    uploadId,
    slug,
    bytes: 8,
    url: `/p/${slug}`,
    replayed: false,
    alreadyPublished: false,
  };
}

/**
 * A fixed `lastModified` so two instances stand in for the same file on disk
 * being picked twice, which is what a retry actually looks like to the hook.
 */
const FILE_MTIME = Date.parse("2026-01-01T00:00:00.000Z");

function makeFile(name = "about.md") {
  return new File(["# hello"], name, { type: "text/markdown", lastModified: FILE_MTIME });
}

function selectFile(
  rendered: { result: { current: ReturnType<typeof useUploadFile> } },
  file: File = makeFile(),
) {
  const { result } = rendered;
  act(() => {
    result.current.selectFile({
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>);
  });
}

/** The key the hook sent with the nth (1-based) transfer attempt. */
function keySentOn(attempt: number): string {
  const call = transferFileMock.mock.calls[attempt - 1][0];
  return call.idempotencyKey;
}

describe("useUploadFile — two-phase upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts idle with zeroed progress", () => {
    const { result } = renderHook(() => useUploadFile());

    expect(result.current.status).toBe("idle");
    expect(result.current.progress).toEqual({ transfer: 0, finalize: 0 });
  });

  it("enters finalizing only after the transfer resolves, and reaches 100% only on server confirmation", async () => {
    let resolveTransfer: (value: TransferResult) => void = () => {};
    transferFileMock.mockImplementation(
      ({ onProgress }: { onProgress: (percent: number) => void }) => {
        onProgress(40);
        return new Promise((resolve) => {
          resolveTransfer = resolve;
        });
      },
    );
    let resolveFinalize: (value: { slug: string; url: string; alreadyPublished: boolean }) => void = () => {};
    finalizeUploadMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFinalize = resolve;
        }),
    );

    const { result } = renderHook(() => useUploadFile());
    selectFile({ result });

    act(() => {
      void result.current.upload();
    });

    // Phase 1: bytes in flight.
    await waitFor(() => expect(result.current.status).toBe("uploading"));
    expect(result.current.progress.transfer).toBe(40);
    expect(result.current.progress.finalize).toBe(0);

    await act(async () => {
      resolveTransfer(staged("abc"));
    });

    // Phase 2: the transfer is acknowledged, but the server has not confirmed
    // the publish — so the overall progress must not be complete yet.
    await waitFor(() => expect(result.current.status).toBe("finalizing"));
    expect(result.current.progress.finalize).toBe(0);
    expect(result.current.status).not.toBe("success");

    await act(async () => {
      resolveFinalize({ slug: "about", url: "/p/about", alreadyPublished: false });
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.progress).toEqual({ transfer: 100, finalize: 100 });
    expect(result.current.uploadedUrl).toBe("/p/about");
  });

  it("keeps the finalize phase below 100% for as long as the server is silent", async () => {
    let resolveFinalize: (value: { slug: string; url: string; alreadyPublished: boolean }) => void = () => {};
    transferFileMock.mockResolvedValue(staged("abc"));
    finalizeUploadMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFinalize = resolve;
        }),
    );

    const { result } = renderHook(() => useUploadFile());
    selectFile({ result });

    act(() => {
      void result.current.upload();
    });

    await waitFor(() => expect(result.current.status).toBe("finalizing"));

    // Spin the event loop the way a pending fetch would.
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.progress.finalize).toBe(0);
      expect(result.current.status).toBe("finalizing");
    }

    await act(async () => {
      resolveFinalize({ slug: "about", url: "/p/about", alreadyPublished: false });
    });
    await waitFor(() => expect(result.current.status).toBe("success"));
  });

  it("surfaces a finalize timeout and offers a retry that skips re-uploading", async () => {
    transferFileMock.mockResolvedValue(staged("staged-1"));
    finalizeUploadMock.mockRejectedValueOnce(
      new UploadError("Finalizing timed out — try again", "timeout"),
    );

    const { result } = renderHook(() => useUploadFile());
    selectFile({ result });

    await act(async () => {
      await result.current.upload();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errorKind).toBe("timeout");
    expect(result.current.canRetry).toBe(true);
    // Progress must not claim completion after a failed finalize.
    expect(result.current.progress.finalize).toBe(0);

    finalizeUploadMock.mockResolvedValueOnce({
      slug: "about",
      url: "/p/about",
      alreadyPublished: false,
    });

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    // The retry reused the staged upload instead of streaming the file again.
    expect(transferFileMock).toHaveBeenCalledTimes(1);
    expect(finalizeUploadMock).toHaveBeenCalledTimes(2);
  });

  it("retries a slug conflict with overwrite enabled", async () => {
    transferFileMock.mockResolvedValue(staged("staged-2"));
    finalizeUploadMock.mockRejectedValueOnce(new UploadError("already exists", "conflict", 409));

    const { result } = renderHook(() => useUploadFile());
    selectFile({ result });

    await act(async () => {
      await result.current.upload();
    });
    expect(result.current.errorKind).toBe("conflict");

    finalizeUploadMock.mockResolvedValueOnce({
      slug: "about",
      url: "/p/about",
      alreadyPublished: true,
    });

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(finalizeUploadMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ uploadId: "staged-2", overwrite: true }),
    );
  });

  it("surfaces a transfer-phase failure without offering a staged retry", async () => {
    transferFileMock.mockRejectedValue(new UploadError("Network error", "network"));

    const { result } = renderHook(() => useUploadFile());
    selectFile({ result });

    await act(async () => {
      await result.current.upload();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errorKind).toBe("network");
    // A retry is still useful here, but it must re-send the file.
    expect(result.current.canRetry).toBe(true);
  });

  it("rejects a disallowed extension before any request", async () => {
    const { result } = renderHook(() => useUploadFile());

    act(() => {
      result.current.selectFile({
        target: { files: [makeFile("payload.exe")] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errorKind).toBe("validation");
    expect(transferFileMock).not.toHaveBeenCalled();
  });

  it("resetUpload clears progress back to zero", async () => {
    transferFileMock.mockResolvedValue(staged("abc"));
    finalizeUploadMock.mockResolvedValue({
      slug: "about",
      url: "/p/about",
      alreadyPublished: false,
    });

    const { result } = renderHook(() => useUploadFile());
    selectFile({ result });
    await act(async () => {
      await result.current.upload();
    });
    await waitFor(() => expect(result.current.status).toBe("success"));

    act(() => {
      result.current.resetUpload();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.progress).toEqual({ transfer: 0, finalize: 0 });
    expect(result.current.uploadedUrl).toBe("");
  });
});

/**
 * The other half of #469: the key has to be per upload *intent*. Too eager a
 * regeneration and a retry becomes a duplicate upload; too reluctant and a
 * genuinely new upload replays the record of the one before it.
 */
describe("useUploadFile — idempotency key lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reuses one key across repeated attempts at the same upload", async () => {
    transferFileMock.mockRejectedValue(new UploadError("Network error", "network"));

    const { result } = renderHook(() => useUploadFile());
    selectFile({ result });

    await act(async () => {
      await result.current.upload();
    });
    await act(async () => {
      await result.current.retry();
    });
    await act(async () => {
      await result.current.retry();
    });

    expect(transferFileMock).toHaveBeenCalledTimes(3);
    const keys = [keySentOn(1), keySentOn(2), keySentOn(3)];
    expect(isValidIdempotencyKey(keys[0])).toBe(true);
    // Every attempt names the same upload, so the server has one record to
    // answer with however many times the client asks.
    expect(new Set(keys).size).toBe(1);
  });

  it("reuses the key when a failed upload's file is re-picked", async () => {
    transferFileMock.mockRejectedValue(new UploadError("Network error", "network"));

    const { result } = renderHook(() => useUploadFile());
    selectFile({ result });
    await act(async () => {
      await result.current.upload();
    });

    selectFile({ result });
    await act(async () => {
      await result.current.upload();
    });

    expect(keySentOn(2)).toBe(keySentOn(1));
  });

  it("mints a new key for a different file", async () => {
    transferFileMock.mockRejectedValue(new UploadError("Network error", "network"));

    const { result } = renderHook(() => useUploadFile());
    selectFile({ result });
    await act(async () => {
      await result.current.upload();
    });

    selectFile({ result }, makeFile("pricing.md"));
    await act(async () => {
      await result.current.upload();
    });

    expect(keySentOn(2)).not.toBe(keySentOn(1));
    expect(isValidIdempotencyKey(keySentOn(2))).toBe(true);
  });

  it("mints a new key for a new upload of the same file after a publish", async () => {
    transferFileMock.mockResolvedValue(staged("abc"));
    finalizeUploadMock.mockResolvedValue({
      slug: "about",
      url: "/p/about",
      alreadyPublished: false,
    });

    const { result } = renderHook(() => useUploadFile());
    selectFile({ result });
    await act(async () => {
      await result.current.upload();
    });
    await waitFor(() => expect(result.current.status).toBe("success"));

    // The user publishes an update to the same page: a new upload, not a
    // replay of the one that already resolved.
    selectFile({ result });
    await act(async () => {
      await result.current.upload();
    });

    expect(keySentOn(2)).not.toBe(keySentOn(1));
  });

  it("mints a new key after the upload is reset or abandoned", async () => {
    transferFileMock.mockRejectedValue(new UploadError("Network error", "network"));

    const { result } = renderHook(() => useUploadFile());
    selectFile({ result });
    await act(async () => {
      await result.current.upload();
    });

    act(() => {
      result.current.resetUpload();
    });
    selectFile({ result });
    await act(async () => {
      await result.current.upload();
    });

    expect(keySentOn(2)).not.toBe(keySentOn(1));

    act(() => {
      result.current.cancel();
    });
    selectFile({ result });
    await act(async () => {
      await result.current.upload();
    });

    expect(keySentOn(3)).not.toBe(keySentOn(2));
  });

  it("treats a replayed record that is already published as a finished upload", async () => {
    // The first attempt reached the server and published; only its response
    // was lost. The retry is answered from the record, not published twice.
    transferFileMock.mockResolvedValue({
      ...staged("abc"),
      replayed: true,
      alreadyPublished: true,
    });

    const { result } = renderHook(() => useUploadFile());
    selectFile({ result });

    await act(async () => {
      await result.current.upload();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.uploadedUrl).toBe("/p/about");
    // Publishing again is what would have produced the second record.
    expect(finalizeUploadMock).not.toHaveBeenCalled();
  });
});
