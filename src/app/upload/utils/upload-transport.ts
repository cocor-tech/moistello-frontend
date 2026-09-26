/**
 * Byte-level upload transport.
 *
 * `fetch` cannot report upload progress — there is no request-body progress
 * event in the platform — so the transfer phase uses `XMLHttpRequest`, the one
 * browser API that still exposes `upload.onprogress`. The finalize phase sends
 * no body and therefore uses `fetch` with an `AbortController` timeout, which
 * is what makes a stalled publish recoverable.
 *
 * Both phases are cancellable and time-bound; neither leaves the UI in a state
 * it cannot leave.
 */

export class UploadError extends Error {
  readonly kind: "network" | "timeout" | "conflict" | "server" | "validation"

  constructor(
    message: string,
    kind: UploadError["kind"],
    readonly status?: number,
  ) {
    super(message)
    this.name = "UploadError"
    this.kind = kind
  }
}

export interface TransferResult {
  uploadId: string
  slug: string
  bytes: number
}

export interface TransferOptions {
  file: File
  overwrite?: boolean
  timeoutMs: number
  csrfHeaders: Record<string, string>
  onProgress: (percent: number) => void
  signal?: AbortSignal
}

/** POST the file body while reporting `upload.onprogress`. */
export function transferFile({
  file,
  overwrite,
  timeoutMs,
  csrfHeaders,
  onProgress,
  signal,
}: TransferOptions): Promise<TransferResult> {
  return new Promise<TransferResult>((resolve, reject) => {
    const formData = new FormData()
    formData.append("file", file)

    const xhr = new XMLHttpRequest()
    let settled = false
    let timedOut = false

    const query = overwrite ? "?overwrite=true" : ""
    xhr.open("POST", `/api/upload${query}`)

    for (const [key, value] of Object.entries(csrfHeaders)) {
      xhr.setRequestHeader(key, value)
    }

    const cleanup = () => {
      xhr.onload = null
      xhr.onerror = null
      xhr.ontimeout = null
      xhr.onabort = null
      xhr.upload.onprogress = null
      signal?.removeEventListener("abort", onSignalAbort)
    }

    const fail = (error: UploadError) => {
      if (settled) return
      settled = true
      cleanup()
      xhr.abort()
      reject(error)
    }

    const succeed = (result: TransferResult) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(result)
    }

    function onSignalAbort() {
      fail(new UploadError("Upload cancelled", "network"))
    }

    xhr.upload.onprogress = (event: ProgressEvent) => {
      if (!event.lengthComputable || event.total === 0) return
      const percent = Math.min(99, Math.round((event.loaded / event.total) * 100))
      // Capped below 100 on purpose: reaching 100 must mean the *server*
      // confirmed, and that only happens once phase 2 returns.
      onProgress(percent)
    }

    xhr.onload = () => {
      let payload: Record<string, unknown> = {}
      try {
        payload = JSON.parse(xhr.responseText) as Record<string, unknown>
      } catch {
        payload = {}
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        if (typeof payload.uploadId !== "string") {
          fail(new UploadError("Upload response was malformed", "server", xhr.status))
          return
        }
        succeed({
          uploadId: payload.uploadId,
          slug: typeof payload.slug === "string" ? payload.slug : "",
          bytes: typeof payload.bytes === "number" ? payload.bytes : 0,
        })
        return
      }

      const message =
        typeof payload.error === "string" ? payload.error : "Upload failed"
      const kind =
        xhr.status === 409 ? "conflict" : xhr.status < 500 ? "validation" : "server"
      fail(new UploadError(message, kind, xhr.status))
    }

    xhr.onerror = () => fail(new UploadError("Network error — try again", "network"))
    xhr.ontimeout = () => {
      timedOut = true
      fail(new UploadError("Upload timed out — try again", "timeout"))
    }
    xhr.onabort = () => {
      if (!timedOut) fail(new UploadError("Upload cancelled", "network"))
    }

    signal?.addEventListener("abort", onSignalAbort, { once: true })
    xhr.timeout = timeoutMs
    xhr.send(formData)
  })
}

export interface FinalizeOptions {
  uploadId: string
  overwrite?: boolean
  timeoutMs: number
  csrfHeaders: Record<string, string>
  signal?: AbortSignal
}

export interface FinalizeResult {
  slug: string
  url: string
  alreadyPublished: boolean
}

/** Ask the server to publish staged bytes. Aborts on timeout or cancel. */
export async function finalizeUpload({
  uploadId,
  overwrite,
  timeoutMs,
  csrfHeaders,
  signal,
}: FinalizeOptions): Promise<FinalizeResult> {
  // The caller's signal and our timeout both need to abort the request, so the
  // timeout is expressed as an abort reason rather than a separate branch.
  const controller = new AbortController()
  const onCallerAbort = () => controller.abort(signal?.reason)

  if (signal) {
    if (signal.aborted) controller.abort(signal.reason)
    else signal.addEventListener("abort", onCallerAbort, { once: true })
  }

  const timer = setTimeout(() => {
    controller.abort(new UploadError("Finalizing timed out — try again", "timeout"))
  }, timeoutMs)

  try {
    const response = await fetch("/api/upload/finalize", {
      method: "POST",
      headers: { "content-type": "application/json", ...csrfHeaders },
      body: JSON.stringify({ uploadId, overwrite: overwrite === true }),
      signal: controller.signal,
    })

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>

    if (!response.ok) {
      const message =
        typeof payload.error === "string" ? payload.error : "Could not publish the page"
      const kind =
        response.status === 409
          ? "conflict"
          : response.status === 410
            ? "validation"
            : "server"
      throw new UploadError(message, kind, response.status)
    }

    return {
      slug: typeof payload.slug === "string" ? payload.slug : "",
      url: typeof payload.url === "string" ? payload.url : "",
      alreadyPublished: payload.alreadyPublished === true,
    }
  } catch (error) {
    if (error instanceof UploadError) throw error

    if (controller.signal.aborted) {
      const reason = controller.signal.reason
      if (reason instanceof UploadError) throw reason
      throw new UploadError("Finalizing was cancelled", "network")
    }

    throw new UploadError("Network error — try again", "network")
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener("abort", onCallerAbort)
  }
}

/** Best-effort server-side cleanup for an upload the user abandoned. */
export async function cancelStagedUpload(
  uploadId: string,
  csrfHeaders: Record<string, string>,
): Promise<void> {
  try {
    await fetch(`/api/upload?uploadId=${encodeURIComponent(uploadId)}`, {
      method: "DELETE",
      headers: csrfHeaders,
      keepalive: true,
    })
  } catch {
    // Cancellation is advisory: staged bytes are swept by TTL regardless.
  }
}
