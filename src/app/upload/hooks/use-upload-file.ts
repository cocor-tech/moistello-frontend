"use client"

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react"
import { getCsrfHeaders } from "@/lib/auth/csrf"
import { logger } from "@/lib/logger"
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
 * Drives the two-phase upload.
 *
 * Phase 1 streams the file and reports byte progress. Phase 2 asks the server
 * to publish what it staged. `status` only becomes `"success"` after phase 2
 * confirms, so the progress UI can never show 100% for work the server has not
 * finished. A phase-2 timeout leaves the staged bytes intact, which is what
 * makes `retry` safe to expose.
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
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
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
    setProgress(0)
    if (fileRef.current) fileRef.current.value = ""
  }, [])

  const resetUpload = useCallback(() => {
    abortRef.current?.abort()
    stagedRef.current = null
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
    if (staged) void cancelStagedUpload(staged.uploadId, getCsrfHeaders())
    setStatus("idle")
    setMessage("")
    setErrorKind(null)
    setProgress(IDLE_PROGRESS)
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
        const slug = result.slug || stagedRef.current?.uploadId || ""
        setStatus("success")
        setProgress({ transfer: 100, finalize: 100 })
        setErrorKind(null)
        setMessage(`Published as ${result.url || getUploadPath(slug)}`)
        setUploadedUrl(result.url || getUploadPath(slug))
        setFile(null)
        if (fileRef.current) fileRef.current.value = ""
        stagedRef.current = null
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
    [],
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
        timeoutMs: TRANSFER_TIMEOUT_MS,
        csrfHeaders: getCsrfHeaders(),
        signal: controller.signal,
        onProgress: (percent) => {
          if (mountedRef.current) setProgress((current) => ({ ...current, transfer: percent }))
        },
      })

      if (!mountedRef.current) return
      stagedRef.current = { uploadId: staged.uploadId, file }
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
  }, [file, runFinalize])

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
