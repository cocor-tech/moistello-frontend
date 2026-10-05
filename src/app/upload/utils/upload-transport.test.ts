import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IDEMPOTENCY_KEY_HEADER } from "./upload-idempotency";
import { UploadError, finalizeUpload, transferFile } from "./upload-transport";

/**
 * Minimal XMLHttpRequest double. jsdom's real XHR would attempt a network
 * request, so the tests drive the callbacks directly — which is also the only
 * way to assert on the progress cap.
 */
class FakeXhr {
  static instances: FakeXhr[] = [];

  upload = { onprogress: null as ((event: ProgressEvent) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 0;
  responseText = "";
  timeout = 0;
  method = "";
  url = "";
  headers: Record<string, string> = {};
  body: FormData | null = null;
  aborted = false;

  constructor() {
    FakeXhr.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  send(body: FormData) {
    this.body = body;
  }

  abort() {
    this.aborted = true;
  }

  /** Drive a progress event the way the browser would. */
  emitProgress(loaded: number, total: number) {
    this.upload.onprogress?.({
      loaded,
      total,
      lengthComputable: total > 0,
    } as ProgressEvent);
  }

  respond(status: number, payload: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(payload);
    this.onload?.();
  }
}

const originalXhr = globalThis.XMLHttpRequest;

describe("transferFile", () => {
  beforeEach(() => {
    FakeXhr.instances = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).XMLHttpRequest = FakeXhr;
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).XMLHttpRequest = originalXhr;
    vi.unstubAllGlobals();
  });

  const baseOptions = {
    file: new File(["# hi"], "about.md", { type: "text/markdown" }),
    idempotencyKey: "1111111111111111aaaaaaaaaaaa1111",
    timeoutMs: 1000,
    csrfHeaders: { "x-csrf-token": "abc" },
    onProgress: vi.fn(),
  };

  it("caps reported progress below 100 so only server confirmation completes it", async () => {
    const promise = transferFile(baseOptions);

    const xhr = FakeXhr.instances[0];
    xhr.emitProgress(50, 100);
    xhr.emitProgress(100, 100);
    xhr.respond(200, { staged: true, uploadId: "u1", slug: "about", bytes: 4 });

    await expect(promise).resolves.toEqual({
      uploadId: "u1",
      slug: "about",
      bytes: 4,
      url: "",
      replayed: false,
      alreadyPublished: false,
    });

    const reported = (baseOptions.onProgress as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => call[0] as number,
    );
    expect(reported).toEqual([50, 99]);
    expect(Math.max(...reported)).toBeLessThan(100);
  });

  it("ignores progress events with an unknown total", async () => {
    const onProgress = vi.fn();
    const promise = transferFile({ ...baseOptions, onProgress });

    const xhr = FakeXhr.instances[0];
    xhr.emitProgress(120, 0);
    xhr.respond(200, { uploadId: "u1", slug: "about", bytes: 4 });

    await promise;
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("sends the CSRF header and posts to the staging endpoint", async () => {
    const promise = transferFile(baseOptions);
    const xhr = FakeXhr.instances[0];

    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("/api/upload");
    expect(xhr.headers["x-csrf-token"]).toBe("abc");
    expect(xhr.body?.get("file")).toBeInstanceOf(File);

    xhr.respond(200, { uploadId: "u1", slug: "about", bytes: 4 });
    await promise;
  });

  it("sends the caller's idempotency key so a retry resolves to the same upload", async () => {
    const promise = transferFile({ ...baseOptions, idempotencyKey: "retry-key-abc123" });

    expect(FakeXhr.instances[0].headers[IDEMPOTENCY_KEY_HEADER]).toBe("retry-key-abc123");

    FakeXhr.instances[0].respond(200, { uploadId: "u1", slug: "about", bytes: 4 });
    await promise;
  });

  it("reports a record the server replayed for a key it had already seen", async () => {
    const promise = transferFile(baseOptions);
    FakeXhr.instances[0].respond(200, {
      staged: false,
      replayed: true,
      alreadyPublished: true,
      uploadId: "u1",
      slug: "about",
      url: "/p/about",
      bytes: 4,
    });

    await expect(promise).resolves.toMatchObject({
      uploadId: "u1",
      replayed: true,
      alreadyPublished: true,
      url: "/p/about",
    });
  });

  it("appends the overwrite flag when requested", () => {
    void transferFile({ ...baseOptions, overwrite: true }).catch(() => {});
    expect(FakeXhr.instances[0].url).toBe("/api/upload?overwrite=true");
  });

  it("maps a 409 to a conflict error carrying the server message", async () => {
    const promise = transferFile(baseOptions);
    FakeXhr.instances[0].respond(409, { error: "slug already exists" });

    await expect(promise).rejects.toMatchObject({
      kind: "conflict",
      message: "slug already exists",
      status: 409,
    });
  });

  it("maps a 500 to a server error", async () => {
    const promise = transferFile(baseOptions);
    FakeXhr.instances[0].respond(500, {});

    await expect(promise).rejects.toBeInstanceOf(UploadError);
    await promise.catch((error: UploadError) => {
      expect(error.kind).toBe("server");
    });
  });

  it("rejects a malformed success payload rather than resolving with junk", async () => {
    const promise = transferFile(baseOptions);
    FakeXhr.instances[0].respond(200, { staged: true });

    await expect(promise).rejects.toMatchObject({ kind: "server" });
  });

  it("reports a timeout distinctly from a network drop", async () => {
    const promise = transferFile(baseOptions);
    const xhr = FakeXhr.instances[0];
    xhr.timeout = 1000;
    xhr.ontimeout?.();

    await expect(promise).rejects.toMatchObject({ kind: "timeout" });
  });

  it("rejects when the caller aborts", async () => {
    const controller = new AbortController();
    const promise = transferFile({ ...baseOptions, signal: controller.signal });

    controller.abort();

    await expect(promise).rejects.toMatchObject({ kind: "network" });
  });
});

describe("finalizeUpload", () => {
  const baseOptions = {
    uploadId: "u1",
    timeoutMs: 50,
    csrfHeaders: { "x-csrf-token": "abc" },
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the uploadId and returns the published location", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ published: true, slug: "about", url: "/p/about" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(finalizeUpload(baseOptions)).resolves.toEqual({
      slug: "about",
      url: "/p/about",
      alreadyPublished: false,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/upload/finalize");
    expect(JSON.parse(init.body)).toEqual({ uploadId: "u1", overwrite: false });
  });

  it("surfaces an already-published retry as a success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ published: true, slug: "about", url: "/p/about", alreadyPublished: true }),
      }),
    );

    await expect(finalizeUpload(baseOptions)).resolves.toMatchObject({
      alreadyPublished: true,
    });
  });

  it("maps a 410 to a validation error asking for a re-upload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 410,
        json: async () => ({ error: "Staged upload not found. Please upload the file again." }),
      }),
    );

    await expect(finalizeUpload(baseOptions)).rejects.toMatchObject({
      kind: "validation",
      status: 410,
    });
  });

  it("aborts with a timeout error when the server never answers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason);
          });
        });
      }),
    );

    await expect(finalizeUpload(baseOptions)).rejects.toMatchObject({ kind: "timeout" });
  });

  it("maps a dropped connection to a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(finalizeUpload(baseOptions)).rejects.toMatchObject({ kind: "network" });
  });
});
