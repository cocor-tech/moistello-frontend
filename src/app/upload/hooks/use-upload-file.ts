"use client"

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react"
import { getCsrfHeaders } from "@/lib/auth/csrf"
import { logger } from "@/lib/logger"
import {
  createIdempotencyKey,
  getUploadIntentSignature,
} from "../utils/upload-idempotency"
import {
  FINALIZE_TIMEOUT_MS,
  IDLE_PROGRESS,
  TRANSFER_TIMEOUT_MS,
  getUploadPath,
  isAllowedUpload,
  type UploadErrorKind,
  type UploadProgress,
  type UploadStatus,
} from "../utils/upload"
import {
  UploadError,
  cancelStagedUpload,
  finalizeUpload,
  transferFile,
} from "../utils/upload-transport"

export interface UseUploadFileReturn {
  file: File | null
  status: UploadStatus
  message: string
  uploadedUrl: string
  progress: UploadProgress
  errorKind: UploadErrorKind | null
  /** True when the failure is a finalize timeout and a retry is worth offering. */
  canRetry: boolean
  fileRef: React.RefObject<HTMLInputElement>
  selectFile: (event: ChangeEvent<HTMLInputElement>) => void
  clearFile: () => void
  resetUpload: () => void
  upload: () => Promise<void>
  retry: () => Promise<void>
  cancel: () => void
}

/**
 * One upload the user is trying to make: a file, and the idempotency key that
 * names it to the server.
 */
interface UploadIntent {
  key: string
  signature: string
}

/**
 * Drives the two-phase upload.
 *
 * Phase 1 streams the file and reports byte progress. Phase 2 asks the server
 * to publish what it staged. `status` only becomes `"success"` after phase 2
 * confirms, so the progress UI can never show 100% for work the server has not
 * finished. A phase-2 timeout leaves the staged bytes intact, which is what
 * makes `retry` safe to expose.
 *
 * Retries reuse the intent's idempotency key, so the server answers them from
 * the record the first attempt created rather than staging the same bytes
 * twice. The key is replaced only when the upload is genuinely new — a
 * different file, a fresh one after a completed or abandoned upload.
 */
export function useUploadFile(): UseUploadFileReturn {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [message, setMessage] = useState("")
  const [uploadedUrl, setUploadedUrl] = useState("")
  const [progress, setProgress] = useState<UploadProgress>(IDLE_PROGRESS)
  const [errorKind, setErrorKind] = useState<UploadErrorKind | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  /** Survives a `clearFile()` so `retry` still has bytes to finalize. */
  const stagedRef = useRef<{ uploadId: string; file: File } | null>(null)
  const intentRef = useRef<UploadIntent | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  /**
   * The key for this file's upload. The same file keeps its key for as long as
   * the attempt is unresolved, so retries and re-picks collapse server-side;
   * anything else is a new upload and gets a new key.
   */
  const resolveIdempotencyKey = useCallback((target: File): string => {
    const signature = getUploadIntentSignature(target)
    const current = intentRef.current
    if (current && current.signature === signature) return current.key

    const intent: UploadIntent = { key: createIdempotencyKey(), signature }
    intentRef.current = intent
    return intent.key
  }, [])

  const selectFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return
    if (!isAllowedUpload(selectedFile)) {
      setStatus("error")
      setErrorKind("validation")
      setMessage("Only .md and .html files are allowed")
      return
    }
    setFile(selectedFile)
    setStatus("idle")
    setMessage("")
    setErrorKind(null)
    setProgress(IDLE_PROGRESS)
  }, [])

  const clearFile = useCallback(() => {
    setFile(null)
    setProgress(IDLE_PROGRESS)
    if (fileRef.current) fileRef.current.value = ""
  }, [])

  const resetUpload = useCallback(() => {
    abortRef.current?.abort()
    stagedRef.current = null
    intentRef.current = null
    setFile(null)
    setStatus("idle")
    setMessage("")
    setUploadedUrl("")
    setErrorKind(null)
    setProgress(IDLE_PROGRESS)
    if (fileRef.current) fileRef.current.value = ""
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    const staged = stagedRef.current
    stagedRef.current = null
    // The upload was abandoned, so whatever the user starts next is a new one
    // and must not replay a key the server may still remember.
    intentRef.current = null
    if (staged) void cancelStagedUpload(staged.uploadId, getCsrfHeaders())
    setStatus("idle")
    setMessage("")
    setErrorKind(null)
    setProgress(IDLE_PROGRESS)
  }, [])

  /** Terminal success: the page is live, so this upload is resolved. */
  const markPublished = useCallback((slug: string, url: string) => {
    const location = url || getUploadPath(slug)
    setStatus("success")
    setProgress({ transfer: 100, finalize: 100 })
    setErrorKind(null)
    setMessage(`Published as ${location}`)
    setUploadedUrl(location)
    setFile(null)
    if (fileRef.current) fileRef.current.value = ""
    stagedRef.current = null
    // A further upload of the same file is a new intent, not a retry of this
    // one — so the next key must be a new one.
    intentRef.current = null
  }, [])

  /** Phase 2 on its own, so a timed-out finalize can be retried cheaply. */
  const runFinalize = useCallback(
    async (uploadId: string, overwrite: boolean) => {
      const controller = new AbortController()
      abortRef.current = controller
      setStatus("finalizing")

      try {
        const result = await finalizeUpload({
          uploadId,
          overwrite,
          timeoutMs: FINALIZE_TIMEOUT_MS,
          csrfHeaders: getCsrfHeaders(),
          signal: controller.signal,
        })

        if (!mountedRef.current) return
        markPublished(result.slug || stagedRef.current?.uploadId || "", result.url)
      } catch (error) {
        if (!mountedRef.current) return
        const uploadError =
          error instanceof UploadError
            ? error
            : new UploadError("Could not publish the page", "server")
        logger.error("Page finalize failed", { error: uploadError, uploadId })
        setStatus("error")
        setErrorKind(uploadError.kind)
        setMessage(uploadError.message)
      }
    },
    [markPublished],
  )

  const upload = useCallback(async () => {
    if (!file) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus("uploading")
    setMessage("")
    setErrorKind(null)
    setUploadedUrl("")
    setProgress({ transfer: 0, finalize: 0 })

    try {
      const staged = await transferFile({
        file,
        idempotencyKey: resolveIdempotencyKey(file),
        timeoutMs: TRANSFER_TIMEOUT_MS,
        csrfHeaders: getCsrfHeaders(),
        signal: controller.signal,
        onProgress: (percent) => {
          if (mountedRef.current) setProgress((current) => ({ ...current, transfer: percent }))
        },
      })

      if (!mountedRef.current) return
      stagedRef.current = { uploadId: staged.uploadId, file }
      // The record behind this key is already a live page, so an earlier
      // attempt finished the work: finalizing again would publish it twice.
      if (staged.alreadyPublished) {
        markPublished(staged.slug, staged.url)
        return
      }
      await runFinalize(staged.uploadId, false)
    } catch (error) {
      if (!mountedRef.current) return
      const uploadError =
        error instanceof UploadError
          ? error
          : new UploadError("Upload failed", "network")
      logger.error("Page upload failed", { error: uploadError, fileName: file.name })
      setStatus("error")
      setErrorKind(uploadError.kind)
      setMessage(uploadError.message)
    }
  }, [file, markPublished, resolveIdempotencyKey, runFinalize])

  /**
   * Re-run whichever phase failed. A staged upload means only finalize is
   * outstanding, so the file is never re-sent.
   */
  const retry = useCallback(async () => {
    const staged = stagedRef.current
    if (staged) {
      await runFinalize(staged.uploadId, errorKind === "conflict")
      return
    }
    await upload()
  }, [runFinalize, upload, errorKind])

  const canRetry = status === "error" && (stagedRef.current !== null || file !== null)

  return {
    file,
    status,
    message,
    uploadedUrl,
    progress,
    errorKind,
    canRetry,
    fileRef,
    selectFile,
    clearFile,
    resetUpload,
    upload,
    retry,
    cancel,
  }
}
