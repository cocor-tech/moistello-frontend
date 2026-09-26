export const ALLOWED_UPLOAD_EXTENSIONS = [".md", ".html"] as const

/**
 * Upload lifecycle.
 *
 * `uploading` and `finalizing` are deliberately distinct states: the first is
 * "bytes are leaving the browser", the second is "the server is publishing
 * them". Collapsing them is what produced the frozen-at-99% UI, because there
 * was no way to tell a slow write apart from a finished one. `success` is only
 * reachable once the server has confirmed the publish.
 */
export type UploadStatus =
  | "idle"
  | "uploading"
  | "finalizing"
  | "success"
  | "error"

/** Why an attempt failed, so the UI can offer the right affordance. */
export type UploadErrorKind = "validation" | "network" | "conflict" | "timeout" | "server"

/** Per-phase completion, 0-100. Neither reaches 100 until the server confirms. */
export interface UploadProgress {
  /** Bytes handed to the server, 0-100. */
  transfer: number;
  /** Publish confirmation, 0-100. Stays below 100 until finalize resolves. */
  finalize: number;
}

export const IDLE_PROGRESS: UploadProgress = { transfer: 0, finalize: 0 }

/** How long to wait for the publish step before offering a retry. */
export const FINALIZE_TIMEOUT_MS = 15_000

/** How long to wait for the byte transfer before offering a retry. */
export const TRANSFER_TIMEOUT_MS = 60_000

export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".")
  return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : ""
}

export function isAllowedUpload(file: File): boolean {
  return (ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(getFileExtension(file.name))
}

export function getUploadSlug(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "")
}

export function getUploadPath(slug: string): string {
  return `/p/${slug}`
}

export function formatFileSize(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`
}
