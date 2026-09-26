import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUploadFile } from "../hooks/use-upload-file";
import { UploadError } from "../utils/upload-transport";

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

function makeFile(name = "about.md") {
  return new File(["# hello"], name, { type: "text/markdown" });
}

function selectFile(rendered: { result: { current: ReturnType<typeof useUploadFile> } }) {
  const { result } = rendered;
  act(() => {
    result.current.selectFile({
      target: { files: [makeFile()] },
    } as unknown as React.ChangeEvent<HTMLInputElement>);
  });
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
    let resolveTransfer: (value: { uploadId: string; slug: string; bytes: number }) => void = () => {};
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
      resolveTransfer({ uploadId: "abc", slug: "about", bytes: 8 });
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
    transferFileMock.mockResolvedValue({ uploadId: "abc", slug: "about", bytes: 8 });
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
    transferFileMock.mockResolvedValue({ uploadId: "staged-1", slug: "about", bytes: 8 });
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
    transferFileMock.mockResolvedValue({ uploadId: "staged-2", slug: "about", bytes: 8 });
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
    transferFileMock.mockResolvedValue({ uploadId: "abc", slug: "about", bytes: 8 });
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
